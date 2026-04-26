// No relative imports rule
// Enforces use of path aliases (@, @utils, @startup, etc.) instead of relative paths
// Relative paths that go up 3+ levels (../../../) are not allowed

const noRelativeImports = {
  'no-relative-imports': {
    meta: {
      type: 'problem',
      docs: {
        description: 'Disallow relative imports that go up 3+ levels. Use path aliases (@, @utils, @startup, etc.) instead',
        category: 'Best Practices',
        recommended: true
      },
      fixable: null,
      schema: [],
      messages: {
        relativeImport: 'Relative import with 3+ levels detected: "{{path}}". Use path aliases instead (@, @utils, @startup, @data). Example: Use "@utils/filename" instead of "../../../../utils/filename"'
      }
    },
    create(context) {

      // Helper function to check if path uses relative imports with 3+ levels
      function hasDeepRelativePath(path) {
        if (typeof path !== 'string') {
          return false;
        }
        // Match patterns like ../../../, ../../../../, etc. (3 or more levels up)
        const deepRelativePattern = /\.\.\/\.\.\/\.\.\//;
        return deepRelativePattern.test(path);
      }

      // Helper to suggest alias based on path
      function suggestAlias(path) {
        if (path.includes('/utils/') || path.includes('\\utils\\')) {
          return '@utils';
        }
        if (path.includes('/data/') || path.includes('\\data\\')) {
          return '@data';
        }
        // Default to @startup for framework code
        return '@startup';
      }

      return {
        // Check ES6 imports
        ImportDeclaration(node) {
          if (node.source && node.source.type === 'Literal') {
            const importPath = node.source.value;
            if (hasDeepRelativePath(importPath)) {
              const suggestedAlias = suggestAlias(importPath);
              context.report({
                node: node.source,
                messageId: 'relativeImport',
                data: {
                  path: importPath,
                  alias: suggestedAlias
                }
              });
            }
          }
        },

        // Check require() calls
        CallExpression(node) {
          if (node.callee.name === 'require' &&
              node.arguments.length === 1 &&
              node.arguments[0].type === 'Literal') {
            const requirePath = node.arguments[0].value;
            if (hasDeepRelativePath(requirePath)) {
              const suggestedAlias = suggestAlias(requirePath);
              context.report({
                node: node.arguments[0],
                messageId: 'relativeImport',
                data: {
                  path: requirePath,
                  alias: suggestedAlias
                }
              });
            }
          }
        }
      };
    }
  }
};

export { noRelativeImports };
