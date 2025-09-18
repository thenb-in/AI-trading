#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkConsoleUsage() {
  log('🔍 Checking for console usage...', 'blue');

  try {
    // Find all console usage excluding the logger.js file, console overrides, and this script
    const result = execSync(
      'grep -r "console\\." . --include="*.js" --exclude-dir=node_modules --exclude-dir=.git --exclude=logger.js | grep -v "console\\.log = " | grep -v "console\\.error = " | grep -v "console\\.warn = " | grep -v "scripts/lint-checks.js"',
      { encoding: 'utf8', cwd: process.cwd() }
    );

    if (result.trim()) {
      log('❌ Found console usage that should be replaced with logger:', 'red');
      log(result, 'red');
      log('\nPlease replace console.log, console.error, and console.warn with logger.info, logger.error, and logger.warn respectively.', 'yellow');
      return false;
    }
  } catch (error) {
    // grep returns non-zero exit code when no matches found, which is what we want
    if (error.status === 1) {
      log('✅ No console usage found', 'green');
      return true;
    } else {
      log('❌ Error checking console usage:', 'red');
      log(error.message, 'red');
      return false;
    }
  }

  return true;
}

function checkLoggerCommas() {
  log('🔍 Checking for commas in logger calls...', 'blue');

  try {
    // Find logger calls with commas (indicating multiple arguments)
    const result = execSync(
      'grep -r "logger\\.[a-z]*([^)]*,[^)]*)" . --include="*.js" --exclude-dir=node_modules --exclude-dir=.git | grep -v "scripts/lint-checks.js"',
      { encoding: 'utf8', cwd: process.cwd() }
    );

    if (result.trim()) {
      log('❌ Found logger calls with commas that should use template literals or concatenation:', 'red');
      log(result, 'red');
      log('\nPlease replace logger calls with commas with template literals or string concatenation.', 'yellow');
      log('Example: logger.error("Error message", { data }) should be logger.error(`Error message: ${JSON.stringify(data)}`)', 'yellow');
      return false;
    }
  } catch (error) {
    // grep returns non-zero exit code when no matches found, which is what we want
    if (error.status === 1) {
      log('✅ No logger calls with commas found', 'green');
      return true;
    } else {
      log('❌ Error checking logger commas:', 'red');
      log(error.message, 'red');
      return false;
    }
  }

  return true;
}

function main() {
  log('🚀 Running pre-commit lint checks...', 'blue');

  const consoleCheck = checkConsoleUsage();
  const commaCheck = checkLoggerCommas();

  if (consoleCheck && commaCheck) {
    log('✅ All checks passed!', 'green');
    process.exit(0);
  } else {
    log('❌ Pre-commit checks failed. Please fix the issues above before committing.', 'red');
    process.exit(1);
  }
}

main();
