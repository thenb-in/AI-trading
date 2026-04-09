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

function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function setupHuskyHooks() {
  try {
    log('🔧 Setting up Husky hooks...', 'blue');
    
    // Initialize Husky
    log('📦 Initializing Husky...', 'blue');
    execSync('npx husky init', { stdio: 'inherit' });
    
    // Ensure .husky directory exists
    const huskyDir = path.join(process.cwd(), '.husky');
    ensureDirectoryExists(huskyDir);
    
    // Create pre-commit hook content
    const preCommitContent = 'node scripts/check-lowercase-dirs.js\nnpx lint-staged\n';
    const preCommitPath = path.join(huskyDir, 'pre-commit');
    
    // Write pre-commit hook file
    fs.writeFileSync(preCommitPath, preCommitContent);
    
    // Create commit-msg hook content using commitlint
    const commitMsgContent = 'npx --no -- commitlint --edit "$1"\n';
    const commitMsgPath = path.join(huskyDir, 'commit-msg');
    
    // Write commit-msg hook file
    fs.writeFileSync(commitMsgPath, commitMsgContent);
    
    // Create pre-push hook for additional validation and version check
    const prePushContent = 'node scripts/check-version-bump.js\n';
    const prePushPath = path.join(huskyDir, 'pre-push');
    
    // Write pre-push hook file
    fs.writeFileSync(prePushPath, prePushContent);
    
    // Create prepare-commit-msg hook for interactive commit messages
    const prepareCommitMsgContent = 'exec < /dev/tty && npx --no -- commitizen prompt || true\n';
    const prepareCommitMsgPath = path.join(huskyDir, 'prepare-commit-msg');
    
    // Write prepare-commit-msg hook file
    fs.writeFileSync(prepareCommitMsgPath, prepareCommitMsgContent);

    // Post-merge: fix local filename case vs Git after merges (macOS/Windows)
    const postMergeContent = `#!/usr/bin/env sh
set -e

# ORIG_HEAD points to where HEAD was before the merge
git rev-parse --verify ORIG_HEAD >/dev/null 2>&1 || exit 0

# Only check files that changed in the merge (fast even in large repos)
./node_modules/.bin/git-detect-case-change --fix-local --since ORIG_HEAD
`;
    const postMergePath = path.join(huskyDir, 'post-merge');
    fs.writeFileSync(postMergePath, postMergeContent);
    
    // Make the files executable (Unix-like systems only)
    if (process.platform !== 'win32') {
      try {
        fs.chmodSync(preCommitPath, '755');
        log('✅ Made pre-commit hook executable', 'green');
        
        fs.chmodSync(commitMsgPath, '755');
        log('✅ Made commit-msg hook executable', 'green');
        
        fs.chmodSync(prePushPath, '755');
        log('✅ Made pre-push hook executable', 'green');
        
        fs.chmodSync(prepareCommitMsgPath, '755');
        log('✅ Made prepare-commit-msg hook executable', 'green');

        fs.chmodSync(postMergePath, '755');
        log('✅ Made post-merge hook executable', 'green');
      } catch (error) {
        log('⚠️  Could not make hooks executable (this is normal on Windows)', 'yellow');
      }
    }
    
    log('✅ Husky hooks setup completed!', 'green');
    log('📝 Pre-commit hook created at: .husky/pre-commit', 'blue');
    log('📝 Commit-msg hook created at: .husky/commit-msg', 'blue');
    log('📝 Pre-push hook created at: .husky/pre-push', 'blue');
    log('📝 Prepare-commit-msg hook created at: .husky/prepare-commit-msg', 'blue');
    log('📝 Post-merge hook created at: .husky/post-merge', 'blue');

    return true;
  } catch (error) {
    log('❌ Error setting up Husky hooks:', 'red');
    log(error.message, 'red');
    return false;
  }
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
