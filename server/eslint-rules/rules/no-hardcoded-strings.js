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
const { createCatchBlockTracker } = require('../utils/catchBlockTracker');

/**
 * Check if file should be skipped for hardcoded string checks
 */
function shouldSkip(filename) {
  return isConstantsFile(filename) || shouldSkipFile(filename);
}

/**
 * Report hardcoded string with optional fix
 */
function reportHardcoded(node, context, fixerFn = null) {
  const report = { node, messageId: 'hardcodedString' };
  if (fixerFn) {
    report.fix = fixerFn;
  }
  context.report(report);
}

/**
 * Check if a string literal is an argument to logger.error inside a catch block
 */
function isLoggerErrorArgInCatch(node, catchTracker) {
  const parent = node.parent;
  if (parent && parent.type === 'CallExpression') {
    if (isLoggerCall(parent)) {
      const methodName = parent.callee.property?.name;
      if (methodName === 'error' && catchTracker.isInsideCatchBlock()) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Check string literals and template literals for hardcoded content
 */
function checkHardcodedString(node, filename, context, catchTracker) {
  if (shouldSkip(filename)) {
    return;
  }

  // Skip string literals that are arguments to logger.error inside catch blocks
  if (node.type === 'Literal' && typeof node.value === 'string') {
    if (isLoggerErrorArgInCatch(node, catchTracker)) {
      return;
    }
  }

  const analysis = analyzeStringContent(node, context);
  const isLiteral = node.type === 'Literal' && typeof node.value === 'string';

  // For string literals, also check skip patterns
  if (isLiteral) {
    if (node.value.length < 3 || shouldSkipString(node.value)) {
      return;
    }
  }

  // Report if it's a literal-only string
  if (analysis.type === 'literal') {
    reportHardcoded(node, context, (fixer) => {
      const templateLiteral = '`' + analysis.value + '`';
      return fixer.replaceText(node, templateLiteral);
    });
  }
}

/**
 * Check logger calls for proper content requirements
 * Skip logger.error inside catch blocks (handled by logger-args-checker rule)
 */
function checkLoggerCall(node, context, catchTracker) {
  if (!isLoggerCall(node)) {
    return;
  }

  // Skip logger.error inside catch blocks - handled by catchBlockTracker rule
  const methodName = node.callee.property?.name;
  if (methodName === 'error' && catchTracker.isInsideCatchBlock()) {
    return;
  }

  // Only check single-argument logger calls (logger.error in catch blocks already skipped above)
  if (node.arguments.length !== 1) {
    return;
  }

  const arg = node.arguments[0];
  const analysis = analyzeStringContent(arg, context);

  if (analysis.type === 'literal') {
    context.report({
      node,
      messageId: 'loggerOnlyLiteral',
      fix(fixer) {
        return fixer.replaceText(arg, '`' + analysis.value + '`');
      }
    });
  } else if (analysis.type === 'variable') {
    context.report({ node, messageId: 'loggerOnlyVariable' });
  }
}

/**
 * Check error constructor calls for hardcoded strings
 */
function checkErrorConstructorCall(node, context) {
  if (!isErrorConstructorCall(node) || node.arguments.length !== 1) {
    return;
  }

  const arg = node.arguments[0];
  const analysis = analyzeStringContent(arg, context);

  if (analysis.type === 'literal') {
    reportHardcoded(node, context, (fixer) => {
      return fixer.replaceText(arg, '`' + analysis.value + '`');
    });
  }
}

/**
 * Check throw statements for hardcoded strings
 */
function checkThrowStatement(node, context) {
  if (!node.argument) {
    return;
  }

  // Skip Error constructor calls - handled by NewExpression
  if (node.argument.type === 'NewExpression' && node.argument.callee?.name === 'Error') {
    return;
  }

  const analysis = analyzeStringContent(node.argument, context);
  if (analysis.type === 'literal') {
    reportHardcoded(node, context, (fixer) => {
      return fixer.replaceText(node.argument, '`' + analysis.value + '`');
    });
  }
}

/**
 * Check binary expressions for string concatenation
 */
function checkBinaryExpression(node, filename, context) {
  if (shouldSkip(filename) || node.operator !== '+' || !isStringConcatenation(node, context)) {
    return;
  }

  const analysis = analyzeStringContent(node, context);
  if (analysis.type === 'mixed' || analysis.type === 'variable') {
    context.report({
      node,
      messageId: 'convertToTemplateLiteral',
      fix(fixer) {
        return fixer.replaceText(node, convertBinaryExpressionToTemplateLiteral(node, context));
      }
    });
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
      const catchTracker = createCatchBlockTracker();

      /**
       * Check if node is a Promise .catch() call
       */
      function isPromiseCatch(node) {
        return node.type === 'CallExpression' &&
               node.callee.type === 'MemberExpression' &&
               node.callee.property &&
               node.callee.property.name === 'catch';
      }

      return {
        CatchClause(node) {
          catchTracker.pushCatchBlock(node.param);
        },
        'CatchClause:exit'() {
          catchTracker.popCatchBlock();
        },
        CallExpression(node) {
          // Track Promise .catch() callbacks
          if (isPromiseCatch(node) && node.arguments.length > 0) {
            const callback = node.arguments[0];
            if (callback.type === 'ArrowFunctionExpression' || callback.type === 'FunctionExpression') {
              const errorParam = callback.params && callback.params[0];
              catchTracker.pushCatchBlock(errorParam);
            }
          }

          checkLoggerCall(node, context, catchTracker);
        },
        'CallExpression:exit'(node) {
          // Pop Promise .catch() callback from stack
          if (isPromiseCatch(node) && node.arguments.length > 0) {
            const callback = node.arguments[0];
            if (callback.type === 'ArrowFunctionExpression' || callback.type === 'FunctionExpression') {
              catchTracker.popCatchBlock();
            }
          }
        },
        Literal(node) {
          checkHardcodedString(node, filename, context, catchTracker);
        },
        TemplateLiteral(node) {
          checkHardcodedString(node, filename, context, catchTracker);
        },
        NewExpression(node) {
          checkErrorConstructorCall(node, context);
        },
        ThrowStatement(node) {
          checkThrowStatement(node, context);
        },
        BinaryExpression(node) {
          checkBinaryExpression(node, filename, context);
        }
      };
    }
  }
};
