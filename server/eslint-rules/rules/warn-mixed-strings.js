/**
 * Mixed strings warning rule - WARNING level
 *
 * This rule warns about mixed strings (template literals with both literals and variables)
 * and suggests using logger/error calls instead for better debugging and consistency.
 *
 * Key features:
 * - Warns about mixed strings in variable declarations
 * - Warns about mixed strings in object property assignments
 * - Skips certain file types (models, services, routes, etc.)
 * - Skips configuration-like strings (short strings, file paths, etc.)
 */

const { isConstantsFile, shouldSkipFile, shouldSkipString } = require('../utils/fileUtils');
const { analyzeStringContent } = require('../utils/stringUtils');

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

      /**
       * Check if a variable declaration contains mixed strings
       * @param {Object} node - The AST node to check
       */
      function checkVariableDeclaration(node) {
        // Skip if in constants folder or file should be skipped
        if (isConstantsFile(filename) || shouldSkipFile(filename)) {
          return;
        }

        // Skip destructuring assignments
        if (node.id.type === 'ObjectPattern' || node.id.type === 'ArrayPattern') {
          return;
        }

        if (node.init) {
          const analysis = analyzeStringContent(node.init, context);

          if (analysis.type === 'mixed') {
            context.report({
              node,
              messageId: 'mixedStringWarning'
            });
          }
        }
      }

      /**
       * Check if an object property contains mixed strings
       * @param {Object} node - The AST node to check
       */
      function checkObjectProperty(node) {
        // Skip if in constants folder or file should be skipped
        if (isConstantsFile(filename) || shouldSkipFile(filename)) {
          return;
        }

        // Skip if it's just a property name (no value)
        if (!node.value) {
          return;
        }

        // Skip configuration-like properties (short strings, file paths, etc.)
        if (node.value.type === 'Literal' && typeof node.value.value === 'string') {
          const value = node.value.value;
          if (shouldSkipString(value)) {
            return;
          }
        }

        const analysis = analyzeStringContent(node.value, context);

        if (analysis.type === 'mixed') {
          context.report({
            node,
            messageId: 'mixedStringWarning'
          });
        }
      }

      return {
        // Check variable declarations for mixed strings (warning)
        VariableDeclarator(node) {
          checkVariableDeclaration(node);
        },

        // Check object property assignments for mixed strings (warning)
        Property(node) {
          checkObjectProperty(node);
        }
      };
    }
  }
};
