// Mixed strings warning rule - WARNING level
module.exports = {
  'warn-mixed-strings': {
    meta: {
      type: 'suggestion',
      docs: {
        description: 'Warn about mixed strings - consider using logger/error calls instead',
        category: 'Best Practices',
        recommended: true
      },
      fixable: null,
      schema: [],
      messages: {
        mixedStringWarning: 'Mixed string detected. Consider using logger/error calls instead.'
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

      return {
        // Check variable declarations for mixed strings (warning)
        VariableDeclarator(node) {
          // Skip if in constants folder
          if (isConstantsFile) {
            return;
          }
          
          // Skip if file should be skipped
          if (shouldSkipFile) {
            return;
          }

          // Skip destructuring assignments
          if (node.id.type === 'ObjectPattern' || node.id.type === 'ArrayPattern') {
            return;
          }
          
          if (node.init) {
            const analysis = analyzeStringContent(node.init);
            
            if (analysis.type === 'mixed') {
              context.report({
                node,
                messageId: 'mixedStringWarning'
              });
            }
          }
        },

        // Check object property assignments for mixed strings (warning)
        Property(node) {
          // Skip if in constants folder
          if (isConstantsFile) {
            return;
          }
          
          // Skip if file should be skipped
          if (shouldSkipFile) {
            return;
          }

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
          
          if (analysis.type === 'mixed') {
            context.report({
              node,
              messageId: 'mixedStringWarning'
            });
          }
        }
      };
    }
  }
};
