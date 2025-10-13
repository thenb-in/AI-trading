/**
 * String analysis utility functions for ESLint rules
 * Provides common string content analysis logic shared across multiple rules
 */

/**
 * Analyze template literal content
 * @param {Object} node - The template literal node
 * @param {Object} context - ESLint context for source code access
 * @returns {Object} - Analysis result with type and value
 */
function analyzeTemplateLiteral(node, context) {
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

/**
 * Analyze Error constructor call content
 * @param {Object} node - The Error constructor node
 * @param {Object} context - ESLint context for source code access
 * @returns {Object} - Analysis result with type and value
 */
function analyzeErrorConstructor(node, context) {
  if (node.arguments.length === 1) {
    return analyzeStringContent(node.arguments[0], context);
  }
  return { type: 'unknown', value: context.getSourceCode().getText(node) };
}

/**
 * Analyze the content of a string node to determine its type
 * @param {Object} node - The AST node to analyze
 * @param {Object} context - ESLint context for source code access
 * @returns {Object} - Analysis result with type and value
 */
function analyzeStringContent(node, context) {
  // Handle string literals
  if (node.type === 'Literal' && typeof node.value === 'string') {
    return { type: 'literal', value: node.value };
  }

  // Handle template literals
  if (node.type === 'TemplateLiteral') {
    return analyzeTemplateLiteral(node, context);
  }

  // Handle Error constructor calls
  if (node.type === 'NewExpression' &&
      node.callee.name &&
      node.callee.name.endsWith('Error')) {
    return analyzeErrorConstructor(node, context);
  }

  // Handle identifiers (variables)
  if (node.type === 'Identifier') {
    return { type: 'variable', value: node.name };
  }

  // Unknown type
  return { type: 'unknown', value: context.getSourceCode().getText(node) };
}

/**
 * Check if a node represents a logger call
 * @param {Object} node - The AST node to check
 * @returns {boolean} - True if it's a logger call
 */
function isLoggerCall(node) {
  return node.callee.type === 'MemberExpression' && node.callee.object.name === 'logger';
}

/**
 * Check if a node represents an error constructor call
 * @param {Object} node - The AST node to check
 * @returns {boolean} - True if it's an error constructor call
 */
function isErrorConstructorCall(node) {
  return node.type === 'NewExpression' &&
    node.callee.name &&
    node.callee.name.endsWith('Error');
}

/**
 * Check if a node represents a logger or error call
 * @param {Object} node - The AST node to check
 * @returns {boolean} - True if it's a logger or error call
 */
function isLoggerOrErrorCall(node) {
  return isLoggerCall(node) || isErrorConstructorCall(node);
}

module.exports = {
  analyzeStringContent,
  isLoggerCall,
  isErrorConstructorCall,
  isLoggerOrErrorCall
};
