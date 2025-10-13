/**
 * Logger comma usage checker
 * Checks for logger calls with multiple arguments (commas)
 */

const { findJsFiles, getScriptDir, getRelativePath, readFileSafely, shouldSkipFile } = require('../utils/index');
const logger = require('../../../logger');

/**
 * Count commas outside of quotes in a string
 * @param {string} str - String to analyze
 * @returns {number} - Number of commas outside quotes
 */
function countCommasOutsideQuotes(str) {
  let commaCount = 0;
  let inQuotes = false;
  let quoteChar = null;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if ((char === '"' || char === '\'') && (i === 0 || str[i-1] !== '\\')) {
      if (!inQuotes) {
        inQuotes = true;
        quoteChar = char;
      } else if (char === quoteChar) {
        inQuotes = false;
        quoteChar = null;
      }
    } else if (char === ',' && !inQuotes) {
      commaCount++;
    }
  }

  return commaCount;
}

/**
 * Check for logger calls with commas (multiple arguments)
 * @returns {Object} - { passed: boolean, count: number, violations: array }
 */
function checkLoggerCommas() {
  logger.info('🔍 Checking for commas in logger calls...');

  const violations = [];
  const jsFiles = findJsFiles(getScriptDir());

  for (const file of jsFiles) {
    // Skip the lint scripts themselves
    if (shouldSkipFile(file, ['lint-checks', 'setup-hooks'])) {
      continue;
    }

    const content = readFileSafely(file);
    if (!content) {
      continue;
    }

    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      // Check for logger calls with commas (multiple arguments)
      const loggerCallMatch = line.match(/logger\.(info|error|warn|debug|silly|verbose)\s*\(([^)]*)\)/);
      if (loggerCallMatch) {
        const args = loggerCallMatch[2];
        const commaCount = countCommasOutsideQuotes(args);

        if (commaCount > 0) {
          const relativePath = getRelativePath(file);
          violations.push(`${relativePath}:${lineNumber} ${line.trim()}`);
        }
      }
    }
  }

  if (violations.length > 0) {
    logger.error('❌ Found logger calls with commas that should use template literals or concatenation:');
    violations.forEach(violation => logger.error(violation));
    logger.warn('\nPlease replace logger calls with commas with template literals or string concatenation.');
    logger.warn('Example: logger.error("Error message", { data }) should be logger.error(`Error message: ${JSON.stringify(data)}`)');
    return { passed: false, count: violations.length, violations };
  }

  logger.info('✅ No logger calls with commas found');
  return { passed: true, count: 0, violations: [] };
}

module.exports = {
  checkLoggerCommas
};
