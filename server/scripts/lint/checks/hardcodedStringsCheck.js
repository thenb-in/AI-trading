/**
 * Hardcoded strings checker (excluding logger calls)
 * Checks for hardcoded strings in non-logger contexts
 */

const { findJsFiles, getScriptDir, getRelativePath, readFileSafely, shouldSkipFile } = require('../utils/index');
const logger = require('../../../logger');

/**
 * Check if a line contains hardcoded strings in non-logger contexts
 * @param {string} line - Line to check
 * @returns {boolean} - True if contains hardcoded strings
 */
function hasHardcodedString(line) {
  // Skip logger calls - they can have hardcoded strings
  // if (/logger\.[a-z]*\s*\(/.test(line)) {
  //   return false;
  // }
  
  // Skip comments
  if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
    return false;
  }
  
  // Skip require/import statements
  if (line.includes('require(') || line.includes('import ')) {
    return false;
  }
  
  // Skip variable declarations
  if (line.includes('const ') || line.includes('let ') || line.includes('var ')) {
    return false;
  }
  
  // Skip console statements
  if (line.includes('console.')) {
    return false;
  }
  
  // Check for hardcoded strings (3+ characters)
  return /['"`][^'"`]{3,}['"`]/.test(line);
}

/**
 * Check for hardcoded strings in non-logger contexts
 * @returns {Object} - { passed: boolean, count: number, violations: array }
 */
function checkHardcodedStrings() {
  logger.info('🔍 Checking for hardcoded strings (excluding logger calls)...');

  const violations = [];
  const jsFiles = findJsFiles(getScriptDir());

  for (const file of jsFiles) {
    // Skip the lint scripts themselves and model files (models are allowed to have constants)
    const base_folders = ['constants', 'lint/', 'eslint', 'setup-hooks', 'scripts/'];
    const startup_specific_app_folders = ['models/', 'services/', 'routes/'];
    const custom_app_folders = [];
    if (shouldSkipFile(file, [...base_folders, ...startup_specific_app_folders, ...custom_app_folders])) {
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

      if (hasHardcodedString(line)) {
        const relativePath = getRelativePath(file);
        violations.push(`${relativePath}:${lineNumber} ${line.trim()}`);
      }
    }
  }

  if (violations.length > 0) {
    logger.error('❌ Found hardcoded strings in non-logger contexts:');
    violations.forEach(violation => logger.error(violation));
    logger.warn('\nPlease use variables or constants instead of hardcoded strings:');
    logger.warn('Bad: const message = "User not found"');
    logger.warn('Good: const message = USER_NOT_FOUND_MESSAGE');
    logger.warn('Good: const message = `User ${userId} not found`');
    return { passed: false, count: violations.length, violations };
  }

  logger.info('✅ No hardcoded strings found in non-logger contexts');
  return { passed: true, count: 0, violations: [] };
}

module.exports = {
  checkHardcodedStrings
};
