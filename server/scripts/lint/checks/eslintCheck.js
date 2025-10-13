/**
 * ESLint integration checker
 * Runs ESLint on controller files for additional architecture checks
 */

const { runESLint } = require('../utils');
const logger = require('../../../logger');

/**
 * Run ESLint on controller files
 * @returns {Object} - { passed: boolean, count: number, violations: array }
 */
function runESLintOnControllers() {
  const { getControllerFiles } = require('../utils');
  const controllerFiles = getControllerFiles();
  
  if (controllerFiles.length === 0) {
    logger.info('✅ No controller files to lint');
    return { passed: true, count: 0, violations: [] };
  }
  
  // runs eslint custom rules
  const result = runESLint(controllerFiles);
  return { passed: result, count: result ? 0 : 1, violations: result ? [] : ['ESLint violations found'] };
}

module.exports = {
  runESLintOnControllers
};
