// Named exports only rule
// Disallows default exports - only named exports are allowed

export default {
  'named-exports-only': {
    meta: {
      type: 'problem',
      docs: {
        description: 'Only named exports are allowed - default exports are not permitted',
        category: 'Best Practices',
        recommended: true
      },
      fixable: null,
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
        noDefaultExport: 'Default exports are not allowed. Use named exports instead.'
      }
    },
    create(context) {
      const filename = context.getFilename();
      const options = context.options[0] || {};
      const excludePatterns = options.excludePatterns || [];
      
      // Check if file matches any exclude pattern
      const isExcluded = excludePatterns.some(pattern => {
        // Simple pattern matching - check if filename includes the pattern
        return filename.includes(pattern.replace('**', '').replace('/*', ''));
      });
      
      // Allow default exports in certain files (config files, entry points)
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
      
      if (isAllowedFile || isExcluded) {
        return {};
      }

      return {
        ExportDefaultDeclaration(node) {
          context.report({
            node,
            messageId: 'noDefaultExport'
          });
        }
      };
    }
  }
};

