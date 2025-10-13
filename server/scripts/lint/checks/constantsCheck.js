/**
 * Constants organization checker
 * Checks for constants not defined in the constants folder
 */

const { findJsFiles, getScriptDir, getRelativePath, readFileSafely, shouldSkipFile } = require('../utils/index');
const logger = require('../../../logger');

/**
 * Check if a line is importing from constants or logger
 * @param {string} line - Line to check
 * @returns {boolean} - True if importing from constants/logger
 */
function isImportingFromConstantsOrLogger(line) {
  return (
    line.includes('require(\'./constants\')') ||
    line.includes('from \'../constants\'') ||
    line.includes('require(\'./logger\')') ||
    line.includes('from \'../logger\'')
  );
}

/**
 * Check for constants not in constants folder
 * @returns {Object} - { passed: boolean, count: number, violations: array }
 */
function checkConstantsInSingleFolder() {
  logger.info('🔍 Checking for constants in single folder...');

  const violations = [];
  const jsFiles = findJsFiles(getScriptDir());

  for (const file of jsFiles) {
    // Skip constants files, logger files, and lint scripts
    if (shouldSkipFile(file, ['constants', 'logger.js', 'lint-checks', 'setup-hooks'])) {
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

      // Check for const declarations with UPPER_CASE names
      const constMatch = line.match(/const\s+([A-Z_][A-Z0-9_]*)\s*=/);
      if (constMatch) {
        // Skip if it's importing from constants
        if (isImportingFromConstantsOrLogger(line)) {
          continue;
        }

        const relativePath = getRelativePath(file);
        violations.push(`${relativePath}:${lineNumber} ${line.trim()}`);
      }

      // Check for object property assignments that look like constants
      const assignmentMatch = line.match(/([A-Z_][A-Z0-9_]*)\s*:\s*[^,}]/);
      if (assignmentMatch && !line.includes('require') && !line.includes('import')) {
        const relativePath = getRelativePath(file);
        violations.push(`${relativePath}:${lineNumber} ${line.trim()}`);
      }
    }
  }

  if (violations.length > 0) {
    logger.error('❌ Found constants that should be in constants folder:');
    violations.forEach(violation => logger.error(violation));
    logger.warn('\nPlease move constants to constants/index.js and import them:');
    logger.warn('Bad: const API_URL = "http://localhost:3000";');
    logger.warn('Good: const { API_URL } = require(\'./constants\');');
    logger.info('\nConstants should be centralized in constants/index.js for better maintainability.');
    return { passed: false, count: violations.length, violations };
  }

  logger.info('✅ All constants are properly organized in constants folder');
  return { passed: true, count: 0, violations: [] };
}

module.exports = {
  checkConstantsInSingleFolder
};
