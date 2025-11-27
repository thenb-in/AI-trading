// No inline components rule
// Disallows component definitions inside other components

export default {
  'no-inline-components': {
    meta: {
      type: 'problem',
      docs: {
        description: 'Disallow inline component definitions inside other components',
        category: 'Best Practices',
        recommended: true
      },
      fixable: null,
      schema: [],
      messages: {
        inlineComponent: 'Component definition found inside another component. Move component definition outside.'
      }
    },
    create(context) {
      const componentStack = [];

      /**
       * Check if a function is a React component
       */
      function isComponent(node) {
        if (node.type === 'FunctionDeclaration') {
          return node.id && /^[A-Z]/.test(node.id.name);
        }
        if (node.type === 'ArrowFunctionExpression' || node.type === 'FunctionExpression') {
          // Check if it's assigned to a variable starting with uppercase
          const parent = node.parent;
          if (parent && parent.type === 'VariableDeclarator' && parent.id) {
            return /^[A-Z]/.test(parent.id.name);
          }
        }
        return false;
      }

      /**
       * Check if node returns JSX
       */
      function returnsJSX(node) {
        if (!node.body) return false;
        
        if (node.body.type === 'JSXElement' || node.body.type === 'JSXFragment') {
          return true;
        }
        
        if (node.body.type === 'BlockStatement') {
          return node.body.body.some(stmt => 
            stmt.type === 'ReturnStatement' && 
            stmt.argument && 
            (stmt.argument.type === 'JSXElement' || stmt.argument.type === 'JSXFragment')
          );
        }
        
        return false;
      }

      return {
        // Track when we enter a component
        'FunctionDeclaration'(node) {
          if (isComponent(node) && returnsJSX(node)) {
            if (componentStack.length > 0) {
              // We're inside another component
              context.report({
                node,
                messageId: 'inlineComponent'
              });
            }
            componentStack.push(node);
          }
        },
        'ArrowFunctionExpression'(node) {
          if (isComponent(node) && returnsJSX(node)) {
            if (componentStack.length > 0) {
              // We're inside another component
              context.report({
                node,
                messageId: 'inlineComponent'
              });
            }
            componentStack.push(node);
          }
        },
        'FunctionExpression'(node) {
          if (isComponent(node) && returnsJSX(node)) {
            if (componentStack.length > 0) {
              // We're inside another component
              context.report({
                node,
                messageId: 'inlineComponent'
              });
            }
            componentStack.push(node);
          }
        }
      };
    }
  }
};

