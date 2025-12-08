// Bottom exports only rule
// Requires that exports be written at the bottom of the file using export { name }
// instead of inline exports like export function Component() or export const Component = ...

export default {
  'bottom-exports-only': {
    meta: {
      type: 'suggestion',
      docs: {
        description: 'Require exports to be written at the bottom of the file using export { name } instead of inline exports',
        category: 'Best Practices',
        recommended: true
      },
      fixable: 'code',
      schema: [{
        type: 'object',
        properties: {
          excludePatterns: {
            type: 'array',
            items: { type: 'string' }
          }
        }
      }],
      messages: {
        inlineExport: 'Inline exports are not allowed. Move the export to the bottom of the file using export { {{name}} }.',
        multipleExports: 'Multiple inline exports found. Move all exports to the bottom of the file using export { {{names}} }.'
      }
    },
    create(context) {
      const filename = context.getFilename();
      const options = context.options[0] || {};
      const excludePatterns = options.excludePatterns || [];

      // Check if file matches any exclude pattern
      const isExcluded = excludePatterns.some(pattern => {
        return filename.includes(pattern.replace('**', '').replace('/*', ''));
      });

      // Allow inline exports in certain files (config files, entry points, test files)
      const allowedFiles = [
        'eslint.config.js',
        'vite.config.js',
        'tailwind.config.js',
        'postcss.config.js',
        'main.jsx',
        'index.jsx',
        'App.jsx',
        '.test.js',
        '.test.jsx',
        '.spec.js',
        '.spec.jsx'
      ];

      const isAllowedFile = allowedFiles.some(allowed => filename.endsWith(allowed));

      if (isAllowedFile || isExcluded) {
        return {};
      }

      const inlineExports = [];
      const exportedNames = new Set();

      /**
       * Get the name of an exported declaration
       */
      function getExportName(node) {
        if (node.type === 'FunctionDeclaration' && node.id) {
          return node.id.name;
        }
        if (node.type === 'VariableDeclaration') {
          // Handle const/let/var declarations
          const firstDeclarator = node.declarations[0];
          if (firstDeclarator && firstDeclarator.id.type === 'Identifier') {
            return firstDeclarator.id.name;
          }
        }
        if (node.type === 'ClassDeclaration' && node.id) {
          return node.id.name;
        }
        return null;
      }

      /**
       * Check if a node is an export statement at the bottom
       */
      function isBottomExportStatement(node) {
        return node.type === 'ExportNamedDeclaration' &&
          node.declaration === null &&
          node.specifiers &&
          node.specifiers.length > 0;
      }

      return {
        // Handle export function Component() {}
        ExportNamedDeclaration(node) {
          // Skip if it's already a bottom export (export { name })
          if (isBottomExportStatement(node)) {
            return;
          }

          // Skip if it's exporting something that's not a declaration
          if (!node.declaration) {
            return;
          }

          const exportName = getExportName(node.declaration);
          if (!exportName) {
            return;
          }

          // Check if this name is already exported at the bottom
          if (exportedNames.has(exportName)) {
            return;
          }

          inlineExports.push({
            node,
            name: exportName,
            declaration: node.declaration
          });
          exportedNames.add(exportName);
        },

        // After processing all nodes, report and fix
        'Program:exit'(programNode) {
          if (inlineExports.length === 0) {
            return;
          }

          // Check if there are already bottom exports
          const hasBottomExports = programNode.body.some(stmt => isBottomExportStatement(stmt));

          // Get all export names
          const names = inlineExports.map(exp => exp.name);
          const namesList = names.join(', ');

          // Report all inline exports together with a single fix that handles all of them
          // Report on the first export node, but the fix will handle all exports
          const firstExportNode = inlineExports[0].node;
          context.report({
            node: firstExportNode,
            messageId: inlineExports.length > 1 ? 'multipleExports' : 'inlineExport',
            data: {
              name: inlineExports[0].name,
              names: namesList
            },
            fix(fixer) {
              const fixes = [];

              // Remove the export keyword from ALL inline exports
              inlineExports.forEach(({ node: exportNode }) => {
                const exportKeyword = 'export ';
                const declarationStart = exportNode.declaration.range[0];
                const exportKeywordStart = declarationStart - exportKeyword.length;

                // Remove export keyword from this declaration
                fixes.push(
                  fixer.removeRange([exportKeywordStart, declarationStart])
                );
              });

              // Add export statement at the bottom if not already present
              if (!hasBottomExports) {
                const lastStatement = programNode.body[programNode.body.length - 1];

                // Add newline and export statement with all names
                const exportStatement = `\n\nexport { ${names.join(', ')} };`;
                fixes.push(
                  fixer.insertTextAfter(lastStatement, exportStatement)
                );
              } else {
                // Find the last export statement and add to it
                let lastExportNode = null;
                for (let i = programNode.body.length - 1; i >= 0; i--) {
                  if (isBottomExportStatement(programNode.body[i])) {
                    lastExportNode = programNode.body[i];
                    break;
                  }
                }

                if (lastExportNode) {
                  // Check if our names are already in the export
                  const existingNames = lastExportNode.specifiers.map(spec => spec.exported.name);
                  const newNames = names.filter(name => !existingNames.includes(name));

                  if (newNames.length > 0) {
                    // Add new names to existing export - find the closing brace
                    const closingBracePos = lastExportNode.range[1] - 1; // Position of '}'

                    const newExports = `, ${newNames.join(', ')}`;
                    fixes.push(
                      fixer.insertTextBeforeRange([closingBracePos, closingBracePos + 1], newExports)
                    );
                  }
                }
              }

              return fixes;
            }
          });

          // Also report on remaining exports (for visibility) but without fixes
          // This ensures all inline exports are flagged in the lint output
          for (let i = 1; i < inlineExports.length; i++) {
            context.report({
              node: inlineExports[i].node,
              messageId: 'inlineExport',
              data: {
                name: inlineExports[i].name,
                names: namesList
              }
            });
          }
        }
      };
    }
  }
};
