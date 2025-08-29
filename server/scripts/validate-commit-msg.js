#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

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

// Conventional commit types
const ALLOWED_TYPES = ['fix', 'feat', 'chore', 'docs', 'style', 'refactor', 'test', 'build', 'ci', 'perf', 'revert'];

// Commit message validation rules
function validateCommitMessage(commitMsg) {
  const lines = commitMsg.split('\n');
  const firstLine = lines[0].trim();
  
  // Check if first line is empty
  if (!firstLine) {
    return {
      valid: false,
      error: 'Commit message cannot be empty'
    };
  }
  
  // Check commit message length (first line should be <= 72 characters)
  if (firstLine.length > 72) {
    return {
      valid: false,
      error: `Commit message first line is too long (${firstLine.length} characters). Maximum allowed is 72 characters.`
    };
  }
  
  // Check conventional commit format
  const conventionalCommitRegex = /^(fix|feat|chore|docs|style|refactor|test|build|ci|perf|revert)(\(.+\))?: .+/;
  
  if (!conventionalCommitRegex.test(firstLine)) {
    return {
      valid: false,
      error: `Commit message must follow conventional commit format: <type>(<scope>): <description>
      
Allowed types: ${ALLOWED_TYPES.join(', ')}

Examples:
  fix: resolve authentication bug
  feat: add user management feature
  chore: update dependencies
  docs: update README
  style: fix code formatting
  refactor: restructure user service
  test: add unit tests for auth
  build: update build configuration
  ci: add GitHub Actions workflow
  perf: optimize database queries
  revert: revert previous commit

Your message: "${firstLine}"`
    };
  }
  
  // Check if description starts with lowercase
  const colonIndex = firstLine.indexOf(':');
  if (colonIndex !== -1) {
    const description = firstLine.substring(colonIndex + 1).trim();
    if (description.length > 0 && description[0] !== description[0].toLowerCase()) {
      return {
        valid: false,
        error: `Description should start with lowercase letter. Found: "${description[0]}"`
      };
    }
  }
  
  // Check for trailing period
  if (firstLine.endsWith('.')) {
    return {
      valid: false,
      error: 'Description should not end with a period'
    };
  }
  
  // Check body format (if exists)
  if (lines.length > 1) {
    const bodyLines = lines.slice(1);
    for (let i = 0; i < bodyLines.length; i++) {
      const line = bodyLines[i];
      if (line.trim() && line.length > 100) {
        return {
          valid: false,
          error: `Body line ${i + 2} is too long (${line.length} characters). Maximum allowed is 100 characters.`
        };
      }
    }
  }
  
  return { valid: true };
}

function main() {
  try {
    // Get commit message from git hook
    const commitMsgFile = process.argv[2];
    
    if (!commitMsgFile) {
      log('❌ No commit message file provided', 'red');
      log('Usage: node validate-commit-msg.js <commit-msg-file>', 'yellow');
      process.exit(1);
    }
    
    // Read commit message from file
    const commitMsg = fs.readFileSync(commitMsgFile, 'utf8');
    
    log('🔍 Validating commit message...', 'blue');
    log(`Message: ${commitMsg.trim()}`, 'blue');
    
    const validation = validateCommitMessage(commitMsg);
    
    if (validation.valid) {
      log('✅ Commit message validation passed!', 'green');
      process.exit(0);
    } else {
      log('❌ Commit message validation failed:', 'red');
      log(validation.error, 'red');
      log('\n💡 Please fix your commit message and try again.', 'yellow');
      log('📖 For more information about conventional commits, visit:', 'blue');
      log('   https://www.conventionalcommits.org/', 'blue');
      process.exit(1);
    }
    
  } catch (error) {
    log('❌ Error during commit message validation:', 'red');
    log(error.message, 'red');
    process.exit(1);
  }
}

main();
