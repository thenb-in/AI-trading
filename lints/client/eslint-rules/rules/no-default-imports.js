// No default imports rule
// Fixes default imports to named imports (companion to named-exports-only)

const noDefaultImports = {
  'no-default-imports': {
    meta: {
      type: 'problem',
      docs: {
        description: 'Default imports should be converted to named imports',
        category: 'Best Practices',
        recommended: true
      },
      fixable: 'code',
      schema: [],
      messages: {
        noDefaultImport: 'Default imports are not allowed. Use named imports instead.'
      }
    },
    create(context) {
      const filename = context.getFilename();
      
      // Allow default imports in certain files (config files, entry points)
      const allowedFiles = [
        'eslint.config.js',
        'vite.config.js',
        'tailwind.config.js',
        'postcss.config.js',
        'main.jsx',
        'index.jsx',
        'App.jsx'
      ];
      
      const isAllowedFile = allowedFiles.some(allowed => filename.endsWith(allowed));
      
      if (isAllowedFile) {
        return {};
      }

      return {
        ImportDefaultSpecifier(node) {
          const sourceCode = context.getSourceCode();
          const importDeclaration = node.parent;
          
          if (importDeclaration && importDeclaration.type === 'ImportDeclaration') {
            const source = importDeclaration.source.value;
            const localName = node.local.name;
            
            // Only fix relative imports (same codebase)
            // Skip node_modules and absolute paths
            if (source.startsWith('.') || (source.startsWith('/') && !source.startsWith('//'))) {
              context.report({
                node,
                messageId: 'noDefaultImport',
                fix(fixer) {
                  // Convert: import ComponentName from './path'
                  // To: import { ComponentName } from './path'
                  
                  // Check if there are already named imports
                  const namedSpecifiers = importDeclaration.specifiers.filter(
                    s => s.type === 'ImportSpecifier'
                  );
                  
                  if (namedSpecifiers.length > 0) {
                    // Already has named imports, just add to the list
                    const lastNamed = namedSpecifiers[namedSpecifiers.length - 1];
                    const comma = sourceCode.getTokenAfter(lastNamed);
                    return fixer.insertTextAfter(comma || lastNamed, ` ${localName},`);
                  } else {
                    // Replace default import with named import
                    const importText = sourceCode.getText(importDeclaration);
                    const newImport = importText.replace(
                      `import ${localName} from`,
                      `import { ${localName} } from`
                    );
                    return fixer.replaceText(importDeclaration, newImport);
                  }
                }
              });
            }
          }
        }
      };
    }
  }
};

export { noDefaultImports };
