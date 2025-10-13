// Logger commas rule
module.exports = {
  'no-logger-commas': {
    meta: {
      type: 'problem',
      docs: {
        description: 'Disallow commas in logger calls - use template literals instead',
        category: 'Best Practices',
        recommended: true
      },
      fixable: null,
      schema: [],
      messages: {
        noCommas: 'Logger calls should use single argument with template literals instead of multiple arguments'
      }
    },
    create(context) {
      return {
        CallExpression(node) {
          if (node.callee.type === 'MemberExpression' &&
              node.callee.object.name === 'logger' &&
              node.arguments.length > 1) {
            context.report({
              node,
              messageId: 'noCommas'
            });
          }
        }
      };
    }
  }
};
