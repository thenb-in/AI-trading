#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(title) {
  const line = '='.repeat(title.length + 4);
  log(`\n${line}`, 'cyan');
  log(`= ${title} =`, 'cyan');
  log(`${line}\n`, 'cyan');
}

function logSection(title) {
  log(`\n📋 ${title}:`, 'blue');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function runCommand(command, options = {}) {
  try {
    const result = execSync(command, { 
      stdio: options.stdio || 'inherit',
      cwd: options.cwd || process.cwd(),
      ...options
    });
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function checkDependencies() {
  logSection('Checking Dependencies');
  
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    logError('package.json not found');
    return false;
  }
  
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const requiredDeps = ['husky', 'lint-staged', '@commitlint/cli', '@commitlint/config-conventional'];
  
  let allDepsInstalled = true;
  requiredDeps.forEach(dep => {
    if (!packageJson.devDependencies?.[dep] && !packageJson.dependencies?.[dep]) {
      logWarning(`${dep} is not installed`);
      allDepsInstalled = false;
    } else {
      logSuccess(`${dep} is installed`);
    }
  });
  
  return allDepsInstalled;
}

function checkGitHooks() {
  logSection('Checking Git Hooks');
  
  const huskyDir = path.join(process.cwd(), '.husky');
  if (!fs.existsSync(huskyDir)) {
    logError('.husky directory not found');
    return false;
  }
  
  const requiredHooks = ['pre-commit', 'commit-msg', 'pre-push', 'prepare-commit-msg', 'post-merge'];
  let allHooksExist = true;
  
  requiredHooks.forEach(hook => {
    const hookPath = path.join(huskyDir, hook);
    if (fs.existsSync(hookPath)) {
      logSuccess(`${hook} hook exists`);
    } else {
      logWarning(`${hook} hook missing`);
      allHooksExist = false;
    }
  });
  
  return allHooksExist;
}

function checkEnvironmentFiles() {
  logSection('Checking Environment Files');
  
  const envFiles = [
    { path: '.env.example', required: true },
    { path: 'startup/client/.env.example', required: true },
    { path: 'startup/server/.env.example', required: true }
  ];
  
  let allEnvFilesExist = true;
  envFiles.forEach(({ path: envPath, required }) => {
    if (fs.existsSync(envPath)) {
      logSuccess(`${envPath} exists`);
    } else if (required) {
      logError(`${envPath} is missing (required)`);
      allEnvFilesExist = false;
    } else {
      logWarning(`${envPath} is missing (optional)`);
    }
  });
  
  return allEnvFilesExist;
}

function checkLintConfiguration() {
  logSection('Checking Lint Configuration');
  
  const configFiles = [
    { path: 'commitlint.config.js', required: true },
    { path: 'startup/client/eslint.config.js', required: true },
    { path: 'startup/server/.eslintrc.js', required: false }
  ];
  
  let allConfigsExist = true;
  configFiles.forEach(({ path: configPath, required }) => {
    if (fs.existsSync(configPath)) {
      logSuccess(`${configPath} exists`);
    } else if (required) {
      logError(`${configPath} is missing (required)`);
      allConfigsExist = false;
    } else {
      logWarning(`${configPath} is missing (optional)`);
    }
  });
  
  return allConfigsExist;
}

function runLintChecks() {
  logSection('Running Lint Checks');
  
  logInfo('Running server lint checks...');
  const serverLint = runCommand('npm run lint', { cwd: path.join(process.cwd(), 'startup', 'server') });

  if (serverLint.success) {
    logSuccess('Server lint checks passed');
  } else {
    logError('Server lint checks failed');
  }

  logInfo('Running client lint checks...');
  const clientLint = runCommand('npm run lint', { cwd: path.join(process.cwd(), 'startup', 'client') });
  
  if (clientLint.success) {
    logSuccess('Client lint checks passed');
  } else {
    logError('Client lint checks failed');
  }
  
  return serverLint.success && clientLint.success;
}

function runTests() {
  logSection('Running Tests');
  
  logInfo('Running server tests...');
  const serverTests = runCommand('npm run test', { cwd: path.join(process.cwd(), 'startup', 'server') });

  if (serverTests.success) {
    logSuccess('Server tests passed');
  } else {
    logError('Server tests failed');
  }

  logInfo('Running client tests...');
  const clientTests = runCommand('npm run test', { cwd: path.join(process.cwd(), 'startup', 'client') });
  
  if (clientTests.success) {
    logSuccess('Client tests passed');
  } else {
    logError('Client tests failed');
  }
  
  return serverTests.success && clientTests.success;
}

function checkBuildProcess() {
  logSection('Checking Build Process');
  
  logInfo('Building client...');
  const clientBuild = runCommand('npm run build', { cwd: path.join(process.cwd(), 'startup', 'client') });
  
  if (clientBuild.success) {
    logSuccess('Client build successful');
  } else {
    logError('Client build failed');
  }
  
  return clientBuild.success;
}

function generateReport() {
  logHeader('Development Environment Health Check Report');
  
  const checks = {
    dependencies: checkDependencies(),
    gitHooks: checkGitHooks(),
    environmentFiles: checkEnvironmentFiles(),
    lintConfiguration: checkLintConfiguration()
  };
  
  logSection('Running Validation Checks');
  
  const lintChecks = runLintChecks();
  const tests = runTests();
  const build = checkBuildProcess();
  
  // Generate summary
  logHeader('Summary Report');
  
  const allChecks = {
    'Dependencies': checks.dependencies,
    'Git Hooks': checks.gitHooks,
    'Environment Files': checks.environmentFiles,
    'Lint Configuration': checks.lintConfiguration,
    'Lint Checks': lintChecks,
    'Tests': tests,
    'Build Process': build
  };
  
  let passedChecks = 0;
  let totalChecks = Object.keys(allChecks).length;
  
  Object.entries(allChecks).forEach(([name, passed]) => {
    if (passed) {
      logSuccess(`${name}: PASSED`);
      passedChecks++;
    } else {
      logError(`${name}: FAILED`);
    }
  });
  
  const successRate = Math.round((passedChecks / totalChecks) * 100);
  
  logHeader(`Overall Health: ${successRate}% (${passedChecks}/${totalChecks})`);
  
  if (successRate === 100) {
    logSuccess('🎉 All checks passed! Your development environment is healthy.');
  } else if (successRate >= 80) {
    logWarning('⚠️  Most checks passed, but there are some issues to address.');
  } else {
    logError('❌ Multiple checks failed. Please address the issues above.');
  }
  
  return successRate;
}

function showHelp() {
  logHeader('Development Utilities Help');
  
  log('Available commands:', 'blue');
  log('  npm run dev-utils          - Run full health check', 'cyan');
  log('  npm run dev-utils:check    - Check dependencies and configuration', 'cyan');
  log('  npm run dev-utils:lint     - Run lint checks only', 'cyan');
  log('  npm run dev-utils:test     - Run tests only', 'cyan');
  log('  npm run dev-utils:build    - Check build process only', 'cyan');
  log('  npm run dev-utils:help     - Show this help message', 'cyan');
  
  log('\nQuick Actions:', 'blue');
  log('  npm run setup              - Full project setup', 'cyan');
  log('  npm run validate           - Run all validations', 'cyan');
  log('  npm run clean              - Clean build artifacts', 'cyan');
  log('  npm run commit             - Interactive commit', 'cyan');
}

function main() {
  const command = process.argv[2];
  
  switch (command) {
    case 'check':
      logHeader('Configuration Check');
      checkDependencies();
      checkGitHooks();
      checkEnvironmentFiles();
      checkLintConfiguration();
      break;
      
    case 'lint':
      logHeader('Lint Checks');
      runLintChecks();
      break;
      
    case 'test':
      logHeader('Test Runner');
      runTests();
      break;
      
    case 'build':
      logHeader('Build Check');
      checkBuildProcess();
      break;
      
    case 'help':
      showHelp();
      break;
      
    default:
      generateReport();
      break;
  }
}

// Export functions for potential use in other scripts
module.exports = {
  checkDependencies,
  checkGitHooks,
  checkEnvironmentFiles,
  checkLintConfiguration,
  runLintChecks,
  runTests,
  checkBuildProcess,
  generateReport
};

if (require.main === module) {
  main();
}
