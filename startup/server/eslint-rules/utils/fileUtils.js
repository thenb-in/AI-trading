/**
 * File utility functions for ESLint rules
 * Provides common file checking logic shared across multiple rules
 */

/**
 * Check if a file is in the constants folder
 * @param {string} filename - The file path to check
 * @returns {boolean} - True if file is in constants folder
 */
function isConstantsFile(filename) {
  return filename.includes('/constants/') || filename.includes('\\constants\\');
}

/**
 * Check if a file should be skipped based on predefined patterns
 * @param {string} filename - The file path to check
 * @returns {boolean} - True if file should be skipped
 */
function shouldSkipFile(filename) {
  const skipPatterns = [
    'models/',
    'services/',
    'routes/',
    'migrations/',
    'scripts/',
    'eslint-rules/',
    'lint/',
    'setup-hooks'
  ];

  return skipPatterns.some(pattern =>
    filename.includes(pattern) || filename.includes(pattern.replace('/', '\\'))
  );
}

/**
 * Check if a string matches common skip patterns
 * @param {string} value - The string value to check
 * @returns {boolean} - True if string matches skip patterns
 */
function matchesSkipPatterns(value) {
  // todo: check if this is correct
  return value.includes('.') ||
    value.includes('/') ||
    value.includes('_') ||
    value.includes('-') ||  // Module names with dashes (e.g., 'winston-daily-rotate-file')
    value.match(/^[A-Z_]+$/) || // UPPER_CASE constants
    value.match(/^[a-z]+$/) ||  // simple lowercase words
    value.includes('env') ||
    value.includes('config') ||
    value.includes('use strict') ||
    value.includes('localhost') ||
    value.includes('http');
}

/**
 * Check if a string should be skipped based on common patterns
 * @param {string} value - The string value to check
 * @returns {boolean} - True if string should be skipped
 */
function shouldSkipString(value) {
  return value.length <= 20 || matchesSkipPatterns(value);
}

module.exports = {
  isConstantsFile,
  shouldSkipFile,
  shouldSkipString
};
