/**
 * Direct dotenv usage checker
 * Checks for direct require('dotenv') or require('dotenv-safe') usage
 */

const { findJsFiles, getScriptDir, getRelativePath, readFileSafely, shouldSkipFile } = require('../utils/index');
const logger = require('../../../logger');

/**
 * Check for direct dotenv usage
 * @returns {Object} - { passed: boolean, count: number, violations: array }
 */
function checkDirectDotenvUsage() {
  logger.info('🔍 Checking for direct dotenv usage...');

  const violations = [];
  const jsFiles = findJsFiles(getScriptDir());

  for (const file of jsFiles) {
    // Skip the centralized env config and lint scripts
    if (shouldSkipFile(file, ['config/env.js', 'lint-checks', 'setup-hooks'])) {
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

      // Check for direct dotenv or dotenv-safe usage (excluding config/env.js)
      if (
        /require\s*\(\s*['"]dotenv['"]\s*\)/.test(line) ||
        /require\s*\(\s*['"]dotenv-safe['"]\s*\)/.test(line)
      ) {
        const relativePath = getRelativePath(file);
        violations.push(`${relativePath}:${lineNumber} ${line.trim()}`);
      }
    }
  }

  if (violations.length > 0) {
    logger.error('❌ Found direct dotenv usage that should use centralized config:');
    violations.forEach(violation => logger.error(violation));
    logger.warn('\nPlease use the centralized environment configuration instead:');
    logger.warn('Replace: require("dotenv") or require("dotenv-safe")');
    logger.warn('With: const env = require("./config/env")');
    logger.info('\nThe centralized config is already set up in config/env.js');
    return { passed: false, count: violations.length, violations };
  }

  logger.info('✅ No direct dotenv usage found');
  return { passed: true, count: 0, violations: [] };
}

module.exports = {
  checkDirectDotenvUsage
};
