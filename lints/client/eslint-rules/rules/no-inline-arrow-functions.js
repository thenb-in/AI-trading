// No inline arrow functions in JSX rule
// Disallows arrow functions defined inline in JSX props

export default {
  'no-inline-arrow-functions': {
    meta: {
      type: 'problem',
      docs: {
        description: 'Disallow inline arrow functions in JSX props - extract to named functions',
        category: 'Best Practices',
        recommended: true
      },
      fixable: null,
      schema: [],
      messages: {
        inlineArrowFunction: 'Inline arrow functions in JSX are not allowed. Extract to a named function or use useCallback.'
      }
    },
    create(context) {
      /**
       * Check if an arrow function is inline in JSX
       */
      function isInlineArrowFunction(node) {
        if (node.type !== 'ArrowFunctionExpression') {
          return false;
        }

        // Allow simple one-liner event handlers (common pattern: onClick={(e) => e.stopPropagation()})
        // These are typically simple and don't cause performance issues
        const isSimpleOneLiner = 
          (node.body.type === 'CallExpression' || 
           node.body.type === 'MemberExpression' ||
           (node.body.type === 'BlockStatement' && node.body.body.length === 1 && 
            node.body.body[0].type === 'ExpressionStatement'));

        // Check if it's directly in a JSX attribute
        let parent = node.parent;
        while (parent) {
          if (parent.type === 'JSXExpressionContainer') {
            const grandParent = parent.parent;
            if (grandParent && grandParent.type === 'JSXAttribute') {
              // Allow simple one-liners in event handlers (onClick, onChange, etc.)
              const attrName = grandParent.name.name;
              const isEventHandler = attrName && (
                attrName.startsWith('on') || 
                ['onClick', 'onChange', 'onSubmit', 'onFocus', 'onBlur', 'onMouseEnter', 
                 'onMouseLeave', 'onKeyDown', 'onKeyUp'].includes(attrName)
              );
              
              if (isEventHandler && isSimpleOneLiner) {
                return false; // Allow simple one-liners in event handlers
              }
              
              return true;
            }
          }
          // Stop if we hit a function declaration/expression (it's not inline)
          if (parent.type === 'FunctionDeclaration' || 
              parent.type === 'FunctionExpression' ||
              parent.type === 'VariableDeclarator') {
            return false;
          }
          parent = parent.parent;
        }
        
        return false;
      }

      return {
        ArrowFunctionExpression(node) {
          if (isInlineArrowFunction(node)) {
            context.report({
              node,
              messageId: 'inlineArrowFunction'
            });
          }
        }
      };
    }
  }
};

