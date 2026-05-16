// No anonymous components rule
// Disallows anonymous function components and arrow function components without names

export default {
  'no-anonymous-components': {
    meta: {
      type: 'problem',
      docs: {
        description: 'Disallow anonymous components - all components must be named',
        category: 'Best Practices',
        recommended: true
      },
      fixable: null,
      schema: [],
      messages: {
        anonymousComponent: 'Component must have a name. Use named function or named arrow function.',
        anonymousArrowComponent: 'Arrow function component must be assigned to a named variable.'
      }
    },
    create(context) {
      /**
       * Check if a function declaration is a React component
       */
      function isComponentName(name) {
        return name && /^[A-Z]/.test(name);
      }

      /**
       * Check if a variable declarator is a React component
       */
      function isComponentVariable(node) {
        if (node.id && node.id.type === 'Identifier') {
          const name = node.id.name;
          // Allow render helper functions (common pattern: renderSomething)
          if (name.startsWith('render') && name.length > 6) {
            return true;
          }
          return isComponentName(name);
        }
        return false;
      }

      return {
        // Check function declarations (anonymous functions are not possible, but check anyway)
        FunctionDeclaration(node) {
          if (!node.id || !isComponentName(node.id.name)) {
            // This shouldn't happen for components, but check if it's JSX-returning
            if (node.body && (
              (node.body.type === 'JSXElement') ||
              (node.body.type === 'BlockStatement' && 
               node.body.body.some(stmt => 
                 stmt.type === 'ReturnStatement' && 
                 stmt.argument && 
                 (stmt.argument.type === 'JSXElement' || stmt.argument.type === 'JSXFragment')
               ))
            )) {
              context.report({
                node,
                messageId: 'anonymousComponent'
              });
            }
          }
        },

        // Check arrow function expressions assigned to variables
        VariableDeclarator(node) {
          if (node.init && node.init.type === 'ArrowFunctionExpression') {
            // Check if it returns JSX
            const returnsJSX = 
              (node.init.body.type === 'JSXElement' || node.init.body.type === 'JSXFragment') ||
              (node.init.body.type === 'BlockStatement' && 
               node.init.body.body.some(stmt => 
                 stmt.type === 'ReturnStatement' && 
                 stmt.argument && 
                 (stmt.argument.type === 'JSXElement' || stmt.argument.type === 'JSXFragment')
               ));

            if (returnsJSX) {
              // Must be assigned to a named variable starting with uppercase
              if (!isComponentVariable(node)) {
                context.report({
                  node,
                  messageId: 'anonymousArrowComponent'
                });
              }
            }
          }
        },

        // Check export default with anonymous components
        ExportDefaultDeclaration(node) {
          if (node.declaration) {
            // Anonymous function expression
            if (node.declaration.type === 'FunctionExpression' && !node.declaration.id) {
              const returnsJSX = 
                (node.declaration.body.type === 'JSXElement' || node.declaration.body.type === 'JSXFragment') ||
                (node.declaration.body.type === 'BlockStatement' && 
                 node.declaration.body.body.some(stmt => 
                   stmt.type === 'ReturnStatement' && 
                   stmt.argument && 
                   (stmt.argument.type === 'JSXElement' || stmt.argument.type === 'JSXFragment')
                 ));
              
              if (returnsJSX) {
                context.report({
                  node,
                  messageId: 'anonymousComponent'
                });
              }
            }
            // Anonymous arrow function
            if (node.declaration.type === 'ArrowFunctionExpression') {
              const returnsJSX = 
                (node.declaration.body.type === 'JSXElement' || node.declaration.body.type === 'JSXFragment') ||
                (node.declaration.body.type === 'BlockStatement' && 
                 node.declaration.body.body.some(stmt => 
                   stmt.type === 'ReturnStatement' && 
                   stmt.argument && 
                   (stmt.argument.type === 'JSXElement' || stmt.argument.type === 'JSXFragment')
                 ));
              
              if (returnsJSX) {
                context.report({
                  node,
                  messageId: 'anonymousArrowComponent'
                });
              }
            }
          }
        }
      };
    }
  }
};

