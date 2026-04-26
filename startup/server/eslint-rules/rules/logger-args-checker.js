/**
 * Logger args checker rule
 * Enforces that logger.error inside catch blocks must have 2 arguments (message and error variable)
 * and that logger.error outside catch blocks must have only 1 argument
 * Other logger methods use single argument with template literals
 */

const { createCatchBlockTracker } = require('../utils/catchBlockTracker');

module.exports = {
  'logger-args-checker': {
    meta: {
      type: 'problem',
      docs: {
        description: 'logger.error can only have 2 arguments inside catch blocks (message and catch error). Outside catch blocks, logger.error must have 1 argument. Other logger methods use single argument with template literals.',
        category: 'Best Practices',
        recommended: true
      },
      fixable: null,
      schema: [],
      messages: {
        noCommas: 'Logger calls should use single argument with template literals instead of multiple arguments (logger.error is exempt)',
        invalidErrorArg: 'logger.error second argument must be an error variable from a catch block',
        tooManyArgs: 'logger.error can only have 2 arguments (message and error variable)',
        missingErrorArg: 'logger.error inside catch block must have 2 arguments: message and error variable from catch block',
        twoArgsOutsideCatch: 'logger.error with 2 arguments is only allowed inside catch blocks. Outside catch blocks, use a single argument with template literals.'
      }
    },
    create(context) {
      const catchTracker = createCatchBlockTracker();

      /**
       * Validate logger.error call
       * Inside catch blocks: must have 2 arguments (message and catch error)
       * Outside catch blocks: must have only 1 argument
       * @param {ASTNode} node - The call expression node
       * @param {number} argCount - Number of arguments
       */
      function validateLoggerError(node, argCount) {
        if (argCount > 2) {
          context.report({ node, messageId: 'tooManyArgs' });
          return;
        }

        const insideCatch = catchTracker.isInsideCatchBlock();

        if (insideCatch) {
          // Inside catch block: must have exactly 2 arguments
          if (argCount !== 2) {
            context.report({ node, messageId: 'missingErrorArg' });
            return;
          }
          if (!catchTracker.isErrorFromCatch(node.arguments[1])) {
            context.report({ node, messageId: 'invalidErrorArg' });
          }
        } else {
          // Outside catch block: must have only 1 argument
          if (argCount === 2) {
            context.report({ node, messageId: 'twoArgsOutsideCatch' });
          }
        }
      }

      /**
       * Check if node is a logger call
       * @param {ASTNode} node - The call expression node
       * @returns {boolean} - True if it's a logger call
       */
      function isLoggerCall(node) {
        return node.callee.type === 'MemberExpression' &&
               node.callee.object.name === 'logger';
      }

      /**
       * Check if node is a Promise .catch() call
       * @param {ASTNode} node - The call expression node
       * @returns {boolean} - True if it's a .catch() call
       */
      function isPromiseCatch(node) {
        return node.type === 'CallExpression' &&
               node.callee.type === 'MemberExpression' &&
               node.callee.property &&
               node.callee.property.name === 'catch';
      }

      /**
       * Validate logger call based on method type
       * @param {ASTNode} node - The call expression node
       */
      function validateLoggerCall(node) {
        const methodName = node.callee.property?.name;
        const argCount = node.arguments.length;

        if (methodName === 'error') {
          validateLoggerError(node, argCount);
        } else if (argCount > 1) {
          context.report({ node, messageId: 'noCommas' });
        }
      }

      return {
        CatchClause(node) {
          catchTracker.pushCatchBlock(node.param);
        },
        'CatchClause:exit'() {
          catchTracker.popCatchBlock();
        },
        CallExpression(node) {
          // Track Promise .catch() callbacks
          if (isPromiseCatch(node) && node.arguments.length > 0) {
            const callback = node.arguments[0];
            // Extract error parameter from callback function
            if (callback.type === 'ArrowFunctionExpression' || callback.type === 'FunctionExpression') {
              const errorParam = callback.params && callback.params[0];
              catchTracker.pushCatchBlock(errorParam);
            }
          }

          if (isLoggerCall(node)) {
            validateLoggerCall(node);
          }
        },
        'CallExpression:exit'(node) {
          // Pop Promise .catch() callback from stack
          if (isPromiseCatch(node) && node.arguments.length > 0) {
            const callback = node.arguments[0];
            if (callback.type === 'ArrowFunctionExpression' || callback.type === 'FunctionExpression') {
              catchTracker.popCatchBlock();
            }
          }
        }
      };
    }
  }
};

