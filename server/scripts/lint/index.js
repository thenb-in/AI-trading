#!/usr/bin/env node
/**
 * Simple Linting System
 * One command to run all linting checks
 */

const logger = require('../../logger');
const { getControllerFiles } = require('./utils');

/**
 * Check for console usage
 */
function checkConsole() {
  const { checkConsoleUsage } = require('./checks/consoleCheck');
  return checkConsoleUsage();
}

/**
 * Check for logger commas
 */
function checkLoggerCommas() {
  const { checkLoggerCommas } = require('./checks/loggerCommasCheck');
  return checkLoggerCommas();
}

/**
 * Check for direct dotenv usage
 */
function checkDotenv() {
  const { checkDirectDotenvUsage } = require('./checks/dotenvCheck');
  return checkDirectDotenvUsage();
}

/**
 * Check for hardcoded strings in non-logger contexts
 */
function checkHardcodedStrings() {
  const { checkHardcodedStrings: checkHardcodedStringsFromModule } = require('./checks/hardcodedStringsCheck');
  return checkHardcodedStringsFromModule();
}

/**
 * Check for constants not in constants folder
 */
function checkConstants() {
  const { checkConstantsInSingleFolder } = require('./checks/constantsCheck');
  return checkConstantsInSingleFolder();
}

/**
 * Check for direct model imports in controllers
 */
function checkModelImports() {
  const { checkModelImports } = require('./checks/modelImportsCheck');
  const controllerFiles = getControllerFiles();
  if (controllerFiles.length === 0) {
    logger.info('✅ No controller files found');
    return { passed: true, count: 0, violations: [] };
  }
  return checkModelImports(controllerFiles);
}

/**
 * Run ESLint on controller files
 */
function checkESLint() {
  const { runESLintOnControllers } = require('./checks/eslintCheck');
  return runESLintOnControllers();
}

/**
 * Main function
 */
function main() {
  logger.info('🚀 Running all linting checks...');

  const checks = [
    { name: 'Console Usage', fn: checkConsole },
    { name: 'Logger Commas', fn: checkLoggerCommas },
    { name: 'Dotenv Usage', fn: checkDotenv },
    { name: 'Hardcoded Strings', fn: checkHardcodedStrings },
    { name: 'Constants Organization', fn: checkConstants },
    { name: 'Model Imports', fn: checkModelImports },
    { name: 'ESLint', fn: checkESLint }
  ];

  let allPassed = true;
  const results = [];

  checks.forEach(check => {
    const result = check.fn();
    results.push({ name: check.name, ...result });
    if (!result.passed) {
      allPassed = false;
    }
    logger.info(''); // Add spacing
  });

  logger.info('📊 Summary:');
  logger.info('='.repeat(40));
  
  // Display counts by category
  let totalViolations = 0;
  results.forEach(result => {
    const status = result.passed ? '✅' : '❌';
    const countText = result.count > 0 ? ` (${result.count} issues)` : '';
    logger.info(`${status} ${result.name}${countText}`);
    totalViolations += result.count;
  });
  
  logger.info('='.repeat(40));
  logger.info(`Total Issues Found: ${totalViolations}`);

  if (allPassed) {
    logger.info('✅ All linting checks passed!');
    process.exit(0);
  } else {
    logger.error('❌ Some linting checks failed');
    logger.error('Please fix the issues above before committing');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main };
