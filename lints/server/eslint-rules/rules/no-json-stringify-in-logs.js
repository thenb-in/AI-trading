// JSON.stringify in logs rule
module.exports = {
  'no-json-stringify-in-logs': {
    meta: {
      type: 'problem',
      docs: {
        description: 'Disallow JSON.stringify in logger calls above debug level - use lower levels for JSON.stringify',
        category: 'Best Practices',
        recommended: true
      },
      fixable: null,
      schema: [],
      messages: {
        noJsonStringifyInLogs: 'JSON.stringify should only be used in debug level or lower logger calls. Move to logger.silly() or use a lower log level',
        noJsonStringifyInNonDebug: 'JSON.stringify detected in {{logLevel}} level. Use lower levels for JSON.stringify to avoid exposing sensitive data'
      }
    },
    create(context) {
      // Define log levels in order of severity (debug is lowest, error is highest)
      const logLevels = {
        'verbose': 0,
        'trace': 0,
        'silly': 0,
        'debug': 1,
        'info': 2,
        'warn': 3,
        'warning': 3,
        'error': 4,
        'fatal': 5
      };

      // Helper function to check if a logger call contains JSON.stringify
      function containsJsonStringify(node) {
        if (!node || !node.arguments || node.arguments.length === 0) {
          return false;
        }

        // Check all arguments for JSON.stringify usage
        for (const arg of node.arguments) {
          if (arg.type === 'CallExpression' &&
              arg.callee.type === 'MemberExpression' &&
              arg.callee.object.name === 'JSON' &&
              arg.callee.property.name === 'stringify') {
            return true;
          }

          // Check template literals for JSON.stringify
          if (arg.type === 'TemplateLiteral' && arg.expressions) {
            for (const expr of arg.expressions) {
              if (expr.type === 'CallExpression' &&
                  expr.callee.type === 'MemberExpression' &&
                  expr.callee.object.name === 'JSON' &&
                  expr.callee.property.name === 'stringify') {
                return true;
              }
            }
          }
        }
        return false;
      }

      // Helper function to get log level from logger call
      function getLogLevel(node) {
        if (node.callee.type === 'MemberExpression' &&
            node.callee.object.name === 'logger') {
          return node.callee.property.name;
        }
        return null;
      }

      return {
        CallExpression(node) {
          // Check logger calls
          if (node.callee.type === 'MemberExpression' &&
              node.callee.object.name === 'logger') {

            const logLevel = getLogLevel(node);
            const hasJsonStringify = containsJsonStringify(node);

            if (hasJsonStringify && logLevel) {
              const levelValue = logLevels[logLevel];

              // Allow debug, verbose, trace levels (level 0)
              if (levelValue > 0) {
                context.report({
                  node,
                  messageId: 'noJsonStringifyInNonDebug',
                  data: {
                    logLevel: logLevel
                  }
                });
              }
            }
          }
        }
      };
    }
  }
};
