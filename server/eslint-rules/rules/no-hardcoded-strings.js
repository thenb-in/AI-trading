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
const { analyzeStringContent, isLoggerCall, isErrorConstructorCall, convertBinaryExpressionToTemplateLiteral, isStringConcatenation } = require('../utils/stringUtils');

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
        messageId: 'loggerOnlyLiteral',
        fix(fixer) {
          // Convert string literal to template literal
          const templateLiteral = '`' + analysis.value + '`';
          return fixer.replaceText(arg, templateLiteral);
        }
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
        messageId: 'hardcodedString',
        fix(fixer) {
          // Convert string literal to template literal
          const templateLiteral = '`' + analysis.value + '`';
          return fixer.replaceText(arg, templateLiteral);
        }
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
    // If throwing a new Error() call, let the CallExpression handler deal with it
    if (node.argument.type === 'NewExpression' &&
        node.argument.callee &&
        node.argument.callee.name === 'Error') {
      // Let the CallExpression handler process this Error constructor call
      return;
    }

    const analysis = analyzeStringContent(node.argument, context);

    if (analysis.type === 'literal') {
      context.report({
        node,
        messageId: 'hardcodedString',
        fix(fixer) {
          // Convert string literal to template literal
          const templateLiteral = '`' + analysis.value + '`';
          return fixer.replaceText(node.argument, templateLiteral);
        }
      });
    }
    // Variables and mixed strings are allowed in throw statements
  }
}

/**
 * Check binary expressions for string concatenation that can be converted to template literals
 * @param {Object} node - The AST node to check
 * @param {string} filename - The filename being checked
 * @param {Object} context - ESLint context
 */
function checkBinaryExpression(node, filename, context) {
  // Skip if in constants folder or file should be skipped
  if (isConstantsFile(filename) || shouldSkipFile(filename)) {
    return;
  }

  // Only check binary expressions with + operator
  if (node.type === 'BinaryExpression' && node.operator === '+') {
    // First check if this is actually string concatenation
    if (!isStringConcatenation(node, context)) {
      return; // Skip mathematical operations
    }

    const analysis = analyzeStringContent(node, context);

    // If it's a mixed expression or has any string content, offer to convert to template literal
    if (analysis.type === 'mixed' || analysis.type === 'variable') {
      context.report({
        node,
        messageId: 'convertToTemplateLiteral',
        fix(fixer) {
          const templateLiteral = convertBinaryExpressionToTemplateLiteral(node, context);
          return fixer.replaceText(node, templateLiteral);
        }
      });
    }
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
      fixable: 'code',
      schema: [],
      messages: {
        hardcodedString: 'Hardcoded string detected. Move to constants folder or use variables.',
        loggerOnlyLiteral: 'Logger/error calls must include variables. Use template literals with variables.',
        loggerOnlyVariable: 'Logger/error calls must include literals. Use template literals with both literals and variables.',
        convertToTemplateLiteral: 'Convert string concatenation to template literal for better readability.'
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

        // Check new Error() constructor calls
        NewExpression(node) {
          checkErrorConstructorCall(node, context);
        },

        // Check throw statements
        ThrowStatement(node) {
          checkThrowStatement(node, context);
        },

        // Check binary expressions for string concatenation
        BinaryExpression(node) {
          checkBinaryExpression(node, filename, context);
        }
      };
    }
  }
};
