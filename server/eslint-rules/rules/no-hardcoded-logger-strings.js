// Hardcoded logger strings rule
module.exports = {
  'no-hardcoded-logger-strings': {
    meta: {
      type: 'problem',
      docs: {
        description: 'Enforce mixed literals and variables in logger calls and error messages - require both literals and variables together',
        category: 'Best Practices',
        recommended: true
      },
      fixable: null,
      schema: [],
      messages: {
        onlyLiteral: 'String contains only literals - must include variables. Use template literals with variables.',
        onlyVariable: 'String contains only variables - must include literals. Use template literals with both literals and variables.',
        warnMixedContent: 'Consider using logger/error calls instead of hardcoded strings with mixed content.'
      }
    },
    create(context) {
      // Helper function to check if a template literal contains variables
      function hasTemplateVariables(templateLiteral) {
        return templateLiteral.expressions && templateLiteral.expressions.length > 0;
      }

      // Helper function to check if a template literal has both literals and variables
      function hasMixedContent(templateLiteral) {
        if (!templateLiteral.expressions || templateLiteral.expressions.length === 0) {
          return false; // Only literals
        }
        
        // Check if there are non-empty string parts (literals) AND expressions (variables)
        const hasNonEmptyLiterals = templateLiteral.quasis.some(quasi => quasi.value.raw.trim().length > 0);
        const hasVariables = templateLiteral.expressions.length > 0;
        
        return hasNonEmptyLiterals && hasVariables;
      }

      // Helper function to analyze string content
      function analyzeStringContent(arg) {
        if (arg.type === 'Literal' && typeof arg.value === 'string') {
          return { type: 'onlyLiteral', hasLiterals: true, hasVariables: false };
        }

        if (arg.type === 'TemplateLiteral') {
          const hasVars = hasTemplateVariables(arg);
          const hasMixed = hasMixedContent(arg);
          
          if (!hasVars) {
            return { type: 'onlyLiteral', hasLiterals: true, hasVariables: false };
          } else if (hasMixed) {
            return { type: 'mixed', hasLiterals: true, hasVariables: true };
          } else {
            return { type: 'onlyVariable', hasLiterals: false, hasVariables: true };
          }
        }

        if (arg.type === 'Identifier') {
          return { type: 'onlyVariable', hasLiterals: false, hasVariables: true };
        }

        return { type: 'unknown', hasLiterals: false, hasVariables: false };
      }

      return {
        CallExpression(node) {
          // Check logger calls
          if (node.callee.type === 'MemberExpression' &&
              node.callee.object.name === 'logger' &&
              node.arguments.length === 1) {
            const arg = node.arguments[0];
            const analysis = analyzeStringContent(arg);

            // ERROR: Logger calls without mixed content
            if (analysis.type === 'onlyLiteral') {
              context.report({
                node,
                messageId: 'onlyLiteral'
              });
            } else if (analysis.type === 'onlyVariable') {
              context.report({
                node,
                messageId: 'onlyVariable'
              });
            }
            // ALLOWED: Logger calls with mixed content (no error)
          }

          // Check error constructor calls (new Error(), new TypeError(), etc.)
          if (node.callee.type === 'NewExpression' &&
              node.callee.callee.name &&
              node.callee.callee.name.endsWith('Error') &&
              node.arguments.length === 1) {
            const arg = node.arguments[0];
            const analysis = analyzeStringContent(arg);

            // ERROR: Error constructors without mixed content
            if (analysis.type === 'onlyLiteral') {
              context.report({
                node,
                messageId: 'onlyLiteral'
              });
            } else if (analysis.type === 'onlyVariable') {
              context.report({
                node,
                messageId: 'onlyVariable'
              });
            }
            // ALLOWED: Error constructors with mixed content (no error)
          }
        },

        // Check throw statements with string literals directly
        ThrowStatement(node) {
          if (node.argument) {
            const analysis = analyzeStringContent(node.argument);
            
            // ERROR: Throw statements without mixed content
            if (analysis.type === 'onlyLiteral') {
              context.report({
                node,
                messageId: 'onlyLiteral'
              });
            } else if (analysis.type === 'onlyVariable') {
              context.report({
                node,
                messageId: 'onlyVariable'
              });
            }
            // ALLOWED: Throw statements with mixed content (no error)
          }
        },

        // Check variable declarations for hardcoded strings (excluding destructuring)
        VariableDeclarator(node) {
          // Skip destructuring assignments
          if (node.id.type === 'ObjectPattern' || node.id.type === 'ArrayPattern') {
            return;
          }
          
          if (node.init) {
            const analysis = analyzeStringContent(node.init);
            
            // ERROR: Variable declarations without mixed content (only literals)
            if (analysis.type === 'onlyLiteral') {
              context.report({
                node,
                messageId: 'onlyLiteral'
              });
            } else if (analysis.type === 'mixed') {
              // WARN: Variable declarations with mixed content (not logger/error context)
              context.report({
                node,
                messageId: 'warnMixedContent'
              });
            }
            // ALLOWED: Variable declarations with only variables (like const x = someOtherVar)
          }
        },

        // Check object property assignments for hardcoded strings (excluding config-like properties)
        Property(node) {
          // Skip if it's just a property name (no value)
          if (!node.value) {
            return;
          }
          
          // Skip configuration-like properties (short strings, file paths, etc.)
          if (node.value.type === 'Literal' && typeof node.value.value === 'string') {
            const value = node.value.value;
            // Skip short strings, file paths, environment variable names, etc.
            if (value.length <= 20 || 
                value.includes('.') || 
                value.includes('/') || 
                value.includes('_') ||
                value.match(/^[A-Z_]+$/) || // UPPER_CASE constants
                value.match(/^[a-z]+$/) ||  // simple lowercase words
                value.includes('env') ||
                value.includes('config')) {
              return;
            }
          }
          
          const analysis = analyzeStringContent(node.value);
          
          // ERROR: Object property values without mixed content (only literals)
          if (analysis.type === 'onlyLiteral') {
            context.report({
              node,
              messageId: 'onlyLiteral'
            });
          } else if (analysis.type === 'mixed') {
            // WARN: Object property values with mixed content (not logger/error context)
            context.report({
              node,
              messageId: 'warnMixedContent'
            });
          }
          // ALLOWED: Object property values with only variables
        }
      };
    }
  }
};
