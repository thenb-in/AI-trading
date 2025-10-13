// Hardcoded strings rule - ERROR level
module.exports = {
  'no-hardcoded-strings': {
    meta: {
      type: 'problem',
      docs: {
        description: 'Enforce no hardcoded strings except in constants folder, require variables in logger/error calls',
        category: 'Best Practices',
        recommended: true
      },
      fixable: null,
      schema: [],
      messages: {
        hardcodedString: 'Hardcoded string detected. Move to constants folder or use variables.',
        loggerOnlyLiteral: 'Logger/error calls must include variables. Use template literals with variables.',
        loggerOnlyVariable: 'Logger/error calls must include literals. Use template literals with both literals and variables.'
      }
    },
    create(context) {
      const filename = context.getFilename();
      
      // Check if file is in constants folder
      const isConstantsFile = filename.includes('/constants/') || filename.includes('\\constants\\');
      
      // Check if file should be skipped (models, services, routes, etc.)
      const skipPatterns = [
        'models/',
        'services/',
        'routes/',
        'migrations/',
        'scripts/',
        'eslint-rules/',
        'lint/',
        'setup-hooks'
      ];
      
      const shouldSkipFile = skipPatterns.some(pattern => 
        filename.includes(pattern) || filename.includes(pattern.replace('/', '\\'))
      );

      // Helper function to analyze string content
      function analyzeStringContent(node) {
        if (node.type === 'Literal' && typeof node.value === 'string') {
          return { type: 'literal', value: node.value };
        }

        if (node.type === 'TemplateLiteral') {
          const hasExpressions = node.expressions && node.expressions.length > 0;
          const hasLiterals = node.quasis.some(quasi => quasi.value.raw.trim().length > 0);
          
          if (hasExpressions && hasLiterals) {
            return { type: 'mixed', value: context.getSourceCode().getText(node) };
          } else if (hasExpressions) {
            return { type: 'variable', value: context.getSourceCode().getText(node) };
          } else {
            return { type: 'literal', value: node.quasis[0].value.raw };
          }
        }

        if (node.type === 'Identifier') {
          return { type: 'variable', value: node.name };
        }

        return { type: 'unknown', value: context.getSourceCode().getText(node) };
      }

      // Helper function to check if it's a logger or error call
      function isLoggerOrErrorCall(node) {
        if (node.callee.type === 'MemberExpression' && node.callee.object.name === 'logger') {
          return true;
        }
        
        if (node.callee.type === 'NewExpression' && 
            node.callee.callee.name && 
            node.callee.callee.name.endsWith('Error')) {
          return true;
        }
        
        return false;
      }

      return {
        // Check string literals
        Literal(node) {
          if (typeof node.value === 'string' && node.value.length >= 3) {
            // Skip if in constants folder
            if (isConstantsFile) {
              return;
            }
            
            // Skip if file should be skipped
            if (shouldSkipFile) {
              return;
            }
            
            // Skip short strings, file paths, environment variables, etc.
            if (node.value.length <= 20 || 
                node.value.includes('.') || 
                node.value.includes('/') || 
                node.value.includes('_') ||
                node.value.match(/^[A-Z_]+$/) || // UPPER_CASE constants
                node.value.match(/^[a-z]+$/) ||  // simple lowercase words
                node.value.includes('env') ||
                node.value.includes('config') ||
                node.value.includes('use strict') ||
                node.value.includes('localhost') ||
                node.value.includes('http')) {
              return;
            }

            context.report({
              node,
              messageId: 'hardcodedString'
            });
          }
        },

        // Check template literals
        TemplateLiteral(node) {
          // Skip if in constants folder
          if (isConstantsFile) {
            return;
          }
          
          // Skip if file should be skipped
          if (shouldSkipFile) {
            return;
          }

          const analysis = analyzeStringContent(node);
          
          if (analysis.type === 'literal') {
            context.report({
              node,
              messageId: 'hardcodedString'
            });
          }
        },

        // Check logger and error calls
        CallExpression(node) {
          if (isLoggerOrErrorCall(node) && node.arguments.length === 1) {
            const arg = node.arguments[0];
            const analysis = analyzeStringContent(arg);

            if (analysis.type === 'literal') {
              context.report({
                node,
                messageId: 'loggerOnlyLiteral'
              });
            } else if (analysis.type === 'variable') {
              context.report({
                node,
                messageId: 'loggerOnlyVariable'
              });
            }
            // Mixed strings are allowed in logger/error calls
          }
        },

        // Check throw statements
        ThrowStatement(node) {
          if (node.argument) {
            const analysis = analyzeStringContent(node.argument);
            
            if (analysis.type === 'literal') {
              context.report({
                node,
                messageId: 'loggerOnlyLiteral'
              });
            } else if (analysis.type === 'variable') {
              context.report({
                node,
                messageId: 'loggerOnlyVariable'
              });
            }
            // Mixed strings are allowed in throw statements
          }
        }
      };
    }
  }
};