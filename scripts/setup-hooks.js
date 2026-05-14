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
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function setupHuskyHooks() {
  // Hook files live in git under .husky/. The bare `husky` call in the
  // `prepare` / `setup` scripts already registers core.hooksPath. Do not
  // run `husky init` or seed defaults here — both overwrite the
  // version-controlled hooks (notably pre-commit gets clobbered to `npm test`).
  log('🔧 Husky hooks are version-controlled; skipping seeding.', 'blue');
  return true;
}

function setupCommitizen() {
  try {
    log('🚀 Setting up Commitizen for interactive commits...', 'magenta');
    
    // Check if commitizen is installed
    try {
      execSync('npx --no -- commitizen --version', { stdio: 'pipe' });
      log('✅ Commitizen is already installed', 'green');
    } catch (error) {
      log('📦 Installing Commitizen...', 'blue');
      execSync('npm install --save-dev commitizen cz-conventional-changelog', { stdio: 'inherit' });
      log('✅ Commitizen installed successfully', 'green');
    }
    
    // Update package.json to include commitizen config
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    if (!packageJson.config) {
      packageJson.config = {};
    }
    
    packageJson.config.commitizen = {
      path: 'cz-conventional-changelog'
    };
    
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    log('✅ Commitizen configuration added to package.json', 'green');
    
    return true;
  } catch (error) {
    log('❌ Error setting up Commitizen:', 'red');
    log(error.message, 'red');
    return false;
  }
}

function setupLintStaged() {
  try {
    log('🔍 Setting up lint-staged configuration...', 'cyan');
    
    // Check if lint-staged is properly configured
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    if (!packageJson['lint-staged']) {
      log('⚠️  lint-staged configuration not found in package.json', 'yellow');
      log('💡 Please ensure lint-staged is properly configured', 'blue');
    } else {
      log('✅ lint-staged configuration found', 'green');
    }
    
    return true;
  } catch (error) {
    log('❌ Error checking lint-staged configuration:', 'red');
    log(error.message, 'red');
    return false;
  }
}

function main() {
  log('🚀 Starting enhanced cross-platform development setup...', 'blue');
  
  const results = {
    husky: setupHuskyHooks(),
    lintStaged: setupLintStaged(),
    commitizen: setupCommitizen(),
  };
  
  log('\n📊 Setup Results:', 'cyan');
  log(`🔧 Husky Hooks: ${results.husky ? '✅ Success' : '❌ Failed'}`, results.husky ? 'green' : 'red');
  log(`🚀 Commitizen: ${results.commitizen ? '✅ Success' : '❌ Failed'}`, results.commitizen ? 'green' : 'red');
  log(`🔍 Lint Staged: ${results.lintStaged ? '✅ Success' : '❌ Failed'}`, results.lintStaged ? 'green' : 'red');
  
  const allSuccess = Object.values(results).every(result => result === true);
  
  if (allSuccess) {
    log('\n🎉 Enhanced setup completed successfully!', 'green');
    log('💡 Available commands:', 'blue');
    log('   npm run dev          - Start development servers', 'cyan');
    log('   npm run commit       - Interactive commit (via commitizen)', 'cyan');
    log('   npm run lint:all     - Lint all code', 'cyan');
    log('   npm run test         - Run all tests', 'cyan');
    log('   npm run validate     - Full validation', 'cyan');
    log('   npm run clean        - Clean all build artifacts', 'cyan');
    log('\n🔒 Git hooks are now active:', 'blue');
    log('   - Pre-commit: Runs lint-staged', 'cyan');
    log('   - Commit-msg: Validates commit messages with commitlint', 'cyan');
    log('   - Pre-push: Runs quick validation and checks client/server version bumps', 'cyan');
    log('   - Prepare-commit-msg: Interactive commit prompts', 'cyan');
    log('   - Post-merge: git-detect-case-change --fix-local since ORIG_HEAD', 'cyan');
    process.exit(0);
  } else {
    log('\n❌ Some setup steps failed. Please check the error messages above.', 'red');
    process.exit(1);
  }
}

main();
