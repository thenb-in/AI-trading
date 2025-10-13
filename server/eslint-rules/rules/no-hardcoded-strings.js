/**
 * Hardcoded strings rule - ERROR level
 *
 * This rule enforces that hardcoded strings are not used except in the constants folder.
 * It also ensures that logger and error calls include both literals and variables for better debugging.
 *
 * Key features:
 * - Blocks hardcoded strings in most files (except constants folder)
 * - Requires logger calls to have mixed content (literals + variables)
 * - Requires error constructor calls to have variables
 * - Skips certain file types (models, services, routes, etc.)
 */

const { isConstantsFile, shouldSkipFile, shouldSkipString } = require('../utils/fileUtils');
const { analyzeStringContent, isLoggerCall, isErrorConstructorCall } = require('../utils/stringUtils');

/**
 * Check if a string literal should be reported as hardcoded
 * @param {Object} node - The AST node to check
 * @param {string} filename - The filename being checked
 * @param {Object} context - ESLint context
 */
function checkStringLiteral(node, filename, context) {
  if (typeof node.value === 'string' && node.value.length >= 3) {
    // Skip if in constants folder or file should be skipped
    if (isConstantsFile(filename) || shouldSkipFile(filename)) {
      return;
    }

    // Skip strings that match common patterns
    if (shouldSkipString(node.value)) {
      return;
    }

    context.report({
      node,
      messageId: 'hardcodedString'
    });
  }
}

/**
 * Check if a template literal should be reported as hardcoded
 * @param {Object} node - The AST node to check
 * @param {string} filename - The filename being checked
 * @param {Object} context - ESLint context
 */
function checkTemplateLiteral(node, filename, context) {
  // Skip if in constants folder or file should be skipped
  if (isConstantsFile(filename) || shouldSkipFile(filename)) {
    return;
  }

  const analysis = analyzeStringContent(node, context);

  if (analysis.type === 'literal') {
    context.report({
      node,
      messageId: 'hardcodedString'
    });
  }
}

/**
 * Check logger calls for proper content requirements
 * @param {Object} node - The AST node to check
 * @param {Object} context - ESLint context
 */
function checkLoggerCall(node, context) {
  if (isLoggerCall(node) && node.arguments.length === 1) {
    const arg = node.arguments[0];
    const analysis = analyzeStringContent(arg, context);

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
    // Mixed strings are allowed in logger calls
  }
}

/**
 * Check error constructor calls for hardcoded strings
 * @param {Object} node - The AST node to check
 * @param {Object} context - ESLint context
 */
function checkErrorConstructorCall(node, context) {
  if (isErrorConstructorCall(node) && node.arguments.length === 1) {
    const arg = node.arguments[0];
    const analysis = analyzeStringContent(arg, context);

    if (analysis.type === 'literal') {
      context.report({
        node,
        messageId: 'hardcodedString'
      });
    }
    // Variables and mixed strings are allowed in error constructors
  }
}

/**
 * Check throw statements for hardcoded strings
 * @param {Object} node - The AST node to check
 * @param {Object} context - ESLint context
 */
function checkThrowStatement(node, context) {
  if (node.argument) {
    const analysis = analyzeStringContent(node.argument, context);

    if (analysis.type === 'literal') {
      context.report({
        node,
        messageId: 'hardcodedString'
      });
    }
    // Variables and mixed strings are allowed in throw statements
  }
}

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

      return {
        // Check string literals
        Literal(node) {
          checkStringLiteral(node, filename, context);
        },

        // Check template literals
        TemplateLiteral(node) {
          checkTemplateLiteral(node, filename, context);
        },

        // Check logger and error calls
        CallExpression(node) {
          checkLoggerCall(node, context);
          checkErrorConstructorCall(node, context);
        },

        // Check throw statements
        ThrowStatement(node) {
          checkThrowStatement(node, context);
        }
      };
    }
  }
};
