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
    const preCommitContent = 'npx lint-staged\n';
    const preCommitPath = path.join(huskyDir, 'pre-commit');
    
    // Write pre-commit hook file
    fs.writeFileSync(preCommitPath, preCommitContent);
    
    // Create commit-msg hook content
    const commitMsgContent = 'node scripts/validate-commit-msg.js "$1"\n';
    const commitMsgPath = path.join(huskyDir, 'commit-msg');
    
    // Write commit-msg hook file
    fs.writeFileSync(commitMsgPath, commitMsgContent);
    
    // Make the files executable (Unix-like systems only)
    if (process.platform !== 'win32') {
      try {
        fs.chmodSync(preCommitPath, '755');
        log('✅ Made pre-commit hook executable', 'green');
        
        fs.chmodSync(commitMsgPath, '755');
        log('✅ Made commit-msg hook executable', 'green');
      } catch (error) {
        log('⚠️  Could not make hooks executable (this is normal on Windows)', 'yellow');
      }
    }
    
    log('✅ Husky hooks setup completed!', 'green');
    log('📝 Pre-commit hook created at: .husky/pre-commit', 'blue');
    log('📝 Commit-msg hook created at: .husky/commit-msg', 'blue');
    
    return true;
  } catch (error) {
    log('❌ Error setting up Husky hooks:', 'red');
    log(error.message, 'red');
    return false;
  }
}

function main() {
  log('🚀 Starting cross-platform Husky setup...', 'blue');
  
  const success = setupHuskyHooks();
  
  if (success) {
    log('🎉 Setup completed successfully!', 'green');
    log('💡 The git hooks will now run on every commit.', 'blue');
    process.exit(0);
  } else {
    log('❌ Setup failed. Please check the error messages above.', 'red');
    process.exit(1);
  }
}

main();
