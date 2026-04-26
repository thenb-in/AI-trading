// Direct dotenv usage rule
module.exports = {
  'no-direct-dotenv': {
    meta: {
      type: 'problem',
      docs: {
        description: 'Disallow direct dotenv usage - use centralized config/env.js',
        category: 'Best Practices',
        recommended: true
      },
      fixable: null,
      schema: [],
      messages: {
        noDirectDotenv: 'Use centralized environment config instead of direct dotenv. Replace with: const env = require("./config/env")'
      }
    },
    create(context) {
      const filename = context.getFilename();
      return {
        CallExpression(node) {
          if (node.callee.name === 'require' &&
              node.arguments.length === 1 &&
              node.arguments[0].type === 'Literal') {
            const arg = node.arguments[0].value;
            if (arg === 'dotenv' || arg === 'dotenv-safe') {
              // Allow dotenv usage in the centralized config file
              if (filename.includes('config/env.js') || filename.endsWith('config/env.js') || filename.includes('\\config\\env.js') || filename.includes('/config/env.js')) {
                return;
              }
              context.report({
                node,
                messageId: 'noDirectDotenv'
              });
            }
          }
        }
      };
    }
  }
};
