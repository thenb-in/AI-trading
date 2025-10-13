/**
 * Console usage checker
 * Checks for console.log, console.error, console.warn usage
 */

const { findJsFiles, getScriptDir, getRelativePath, readFileSafely, shouldSkipFile } = require('../utils/index');
const logger = require('../../../logger');

/**
 * Check for console usage in JavaScript files
 * @returns {Object} - { passed: boolean, count: number, violations: array }
 */
function checkConsoleUsage() {
  logger.info('🔍 Checking for console usage...');

  const violations = [];
  const jsFiles = findJsFiles(getScriptDir());

  for (const file of jsFiles) {
    // Skip logger.js, lint scripts, setup scripts, and validation scripts
    if (shouldSkipFile(file)) {
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

      // Check for console usage (excluding console overrides)
      if (
        /console\.(log|error|warn)\s*\(/.test(line) &&
        !/console\.(log|error|warn)\s*=/.test(line)
      ) {
        const relativePath = getRelativePath(file);
        violations.push(`${relativePath}:${lineNumber} ${line.trim()}`);
      }
    }
  }

  if (violations.length > 0) {
    logger.error('❌ Found console usage that should be replaced with logger:');
    violations.forEach(violation => logger.error(violation));
    logger.warn('\nPlease replace console.log, console.error, and console.warn with logger.info, logger.error, and logger.warn respectively.');
    return { passed: false, count: violations.length, violations };
  }

  logger.info('✅ No console usage found');
  return { passed: true, count: 0, violations: [] };
}

module.exports = {
  checkConsoleUsage
};
