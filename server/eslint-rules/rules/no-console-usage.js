// Console usage rule
module.exports = {
  'no-console-usage': {
    meta: {
      type: 'problem',
      docs: {
        description: 'Disallow console usage in favor of logger',
        category: 'Best Practices',
        recommended: true
      },
      fixable: null,
      schema: [],
      messages: {
        noConsole: 'Use logger instead of console.{{method}}. Replace with logger.{{loggerMethod}}'
      }
    },
    create(context) {
      return {
        CallExpression(node) {
          if (node.callee.type === 'MemberExpression' &&
              node.callee.object.name === 'console') {
            const method = node.callee.property.name;
            const loggerMethod = method === 'log' ? 'info' : method;

            // Skip if it's a console override (console.log = ...)
            if (node.parent && node.parent.type === 'AssignmentExpression') {
              return;
            }

            context.report({
              node,
              messageId: 'noConsole',
              data: {
                method,
                loggerMethod
              }
            });
          }
        }
      };
    }
  }
};
