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
 * Check if a binary expression is likely a string concatenation
 * @param {Object} node - The binary expression node
 * @param {Object} context - ESLint context for source code access
 * @returns {boolean} - True if it's likely string concatenation
 */
function isStringConcatenation(node, context) {
  if (node.operator !== '+') {
    return false;
  }

  // Check if either side contains string content
  const leftAnalysis = analyzeStringContent(node.left, context);
  const rightAnalysis = analyzeStringContent(node.right, context);

  // If either side is a string literal, it's string concatenation
  if (leftAnalysis.type === 'literal' || rightAnalysis.type === 'literal') {
    return true;
  }

  // If either side is a template literal (mixed), it's string concatenation
  if (leftAnalysis.type === 'mixed' || rightAnalysis.type === 'mixed') {
    return true;
  }

  // If both sides are variables, check if they're likely strings
  // This is a heuristic - we'll be conservative and not convert pure variable + variable
  // unless we have more context
  return false;
}

/**
 * Analyze binary expression (string concatenation with +)
 * @param {Object} node - The binary expression node
 * @param {Object} context - ESLint context for source code access
 * @returns {Object} - Analysis result with type and value
 */
function analyzeBinaryExpression(node, context) {
  if (node.operator !== '+') {
    return { type: 'unknown', value: context.getSourceCode().getText(node) };
  }

  // First check if this is actually string concatenation
  if (!isStringConcatenation(node, context)) {
    return { type: 'unknown', value: context.getSourceCode().getText(node) };
  }

  const leftAnalysis = analyzeStringContent(node.left, context);
  const rightAnalysis = analyzeStringContent(node.right, context);

  // If both sides are literals, it's a literal concatenation
  if (leftAnalysis.type === 'literal' && rightAnalysis.type === 'literal') {
    return { type: 'literal', value: leftAnalysis.value + rightAnalysis.value };
  }

  // If both sides are variables (including template literals), it's a variable concatenation
  if ((leftAnalysis.type === 'variable' || leftAnalysis.type === 'mixed') &&
      (rightAnalysis.type === 'variable' || rightAnalysis.type === 'mixed')) {
    return { type: 'variable', value: context.getSourceCode().getText(node) };
  }

  // Mixed case - has both literals and variables (including template literals)
  // This includes cases like: template literal + variable, string + variable, etc.
  return { type: 'mixed', value: context.getSourceCode().getText(node) };
}

/**
 * Convert binary expression to template literal
 * @param {Object} node - The binary expression node
 * @param {Object} context - ESLint context for source code access
 * @returns {string} - Template literal string
 */
function convertBinaryExpressionToTemplateLiteral(node, context) {
  if (node.operator !== '+') {
    return context.getSourceCode().getText(node);
  }

  const parts = [];

  function processNode(n) {
    if (n.type === 'BinaryExpression' && n.operator === '+') {
      processNode(n.left);
      processNode(n.right);
    } else {
      const analysis = analyzeStringContent(n, context);
      const sourceText = context.getSourceCode().getText(n);

      if (analysis.type === 'literal') {
        parts.push(analysis.value);
      } else if (analysis.type === 'mixed') {
        // If it's already a template literal, extract its content
        if (sourceText.startsWith('`') && sourceText.endsWith('`')) {
          // Remove the backticks and add the content directly
          const content = sourceText.slice(1, -1);
          parts.push(content);
        } else {
          parts.push('${' + sourceText + '}');
        }
      } else {
        // For variables, add the variable name with ${}
        parts.push('${' + sourceText + '}');
      }
    }
  }

  processNode(node);

  // Join all parts and create template literal
  const templateLiteral = '`' + parts.join('') + '`';
  return templateLiteral;
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

  // Handle binary expressions (string concatenation)
  if (node.type === 'BinaryExpression') {
    return analyzeBinaryExpression(node, context);
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
  analyzeTemplateLiteral,
  analyzeBinaryExpression,
  isStringConcatenation,
  convertBinaryExpressionToTemplateLiteral,
  isLoggerCall,
  isErrorConstructorCall,
  isLoggerOrErrorCall
};
