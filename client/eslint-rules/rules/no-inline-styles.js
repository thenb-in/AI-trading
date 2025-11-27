// No inline styles rule
// Disallows inline style objects in JSX

export default {
  'no-inline-styles': {
    meta: {
      type: 'problem',
      docs: {
        description: 'Disallow inline style objects - use className or sx prop instead',
        category: 'Best Practices',
        recommended: true
      },
      fixable: null,
      schema: [],
      messages: {
        inlineStyle: 'Inline style objects are not allowed. Use className with Tailwind classes or sx prop with theme values instead.'
      }
    },
    create(context) {
      /**
       * Check if a node is an inline style object
       */
      function isInlineStyleObject(node) {
        if (node.type === 'ObjectExpression') {
          // Check if it's a style prop value
          const parent = node.parent;
          if (parent && parent.type === 'JSXExpressionContainer') {
            const grandParent = parent.parent;
            if (grandParent && grandParent.type === 'JSXAttribute' && grandParent.name.name === 'style') {
              return true;
            }
          }
        }
        return false;
      }

      return {
        ObjectExpression(node) {
          if (isInlineStyleObject(node)) {
            context.report({
              node,
              messageId: 'inlineStyle'
            });
          }
        }
      };
    }
  }
};

