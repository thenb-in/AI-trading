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
    log('🔧 Setting up Husky pre-commit hooks...', 'blue');
    
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
    
    // Make the file executable (Unix-like systems only)
    if (process.platform !== 'win32') {
      try {
        fs.chmodSync(preCommitPath, '755');
        log('✅ Made pre-commit hook executable', 'green');
      } catch (error) {
        log('⚠️  Could not make pre-commit hook executable (this is normal on Windows)', 'yellow');
      }
    }
    
    log('✅ Husky pre-commit hooks setup completed!', 'green');
    log('📝 Pre-commit hook created at: .husky/pre-commit', 'blue');
    
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
    log('💡 The pre-commit hooks will now run on every commit.', 'blue');
    process.exit(0);
  } else {
    log('❌ Setup failed. Please check the error messages above.', 'red');
    process.exit(1);
  }
}

main();
