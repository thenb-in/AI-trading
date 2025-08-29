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

// Cross-platform file finder
function findJsFiles(dir, excludeDirs = ['node_modules', '.git']) {
  const files = [];
  
  function traverse(currentDir) {
    try {
      const items = fs.readdirSync(currentDir);
      
      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          if (!excludeDirs.includes(item)) {
            traverse(fullPath);
          }
        } else if (item.endsWith('.js')) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
  }
  
  traverse(dir);
  return files;
}

// Get the directory where this script is located
function getScriptDir() {
  return path.dirname(require.main.filename);
}

// Check for console usage
function checkConsoleUsage() {
  log('🔍 Checking for console usage...', 'blue');
  
  const violations = [];
  const jsFiles = findJsFiles(getScriptDir());
  
  for (const file of jsFiles) {
    // Skip logger.js, lint scripts, setup scripts, and validation scripts
    if (file.includes('logger.js') || file.includes('lint-checks') || file.includes('setup-hooks') || file.includes('setup-env') || file.includes('validate-commit')) {
      continue;
    }
    
    try {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNumber = i + 1;
        
        // Check for console usage (excluding console overrides)
        if (
          /console\.(log|error|warn)\s*\(/.test(line) &&
          !/console\.(log|error|warn)\s*=/.test(line)
        ) {
          const relativePath = path.relative(getScriptDir(), file);
          violations.push(`${relativePath}:${lineNumber} ${line.trim()}`);
        }
      }
    } catch (error) {
      // Skip files we can't read
    }
  }
  
  if (violations.length > 0) {
    log('❌ Found console usage that should be replaced with logger:', 'red');
    violations.forEach(violation => log(violation, 'red'));
    log('\nPlease replace console.log, console.error, and console.warn with logger.info, logger.error, and logger.warn respectively.', 'yellow');
    return false;
  }
  
  log('✅ No console usage found', 'green');
  return true;
}

// Check for logger commas
function checkLoggerCommas() {
  log('🔍 Checking for commas in logger calls...', 'blue');
  
  const violations = [];
  const jsFiles = findJsFiles(getScriptDir());
  
  for (const file of jsFiles) {
    // Skip the lint scripts themselves
    if (file.includes('lint-checks') || file.includes('setup-hooks')) {
      continue;
    }
    
    try {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNumber = i + 1;
        
        // Check for logger calls with commas (multiple arguments)
        // Use a more sophisticated approach to detect actual multiple arguments
        const loggerCallMatch = line.match(/logger\.(info|error|warn|debug|silly|verbose)\s*\(([^)]*)\)/);
        if (loggerCallMatch) {
          const args = loggerCallMatch[2];
          // Count commas that are not inside quotes
          let commaCount = 0;
          let inQuotes = false;
          let quoteChar = null;
          
          for (let j = 0; j < args.length; j++) {
            const char = args[j];
            if ((char === '"' || char === "'") && (j === 0 || args[j-1] !== '\\')) {
              if (!inQuotes) {
                inQuotes = true;
                quoteChar = char;
              } else if (char === quoteChar) {
                inQuotes = false;
                quoteChar = null;
              }
            } else if (char === ',' && !inQuotes) {
              commaCount++;
            }
          }
          
          if (commaCount > 0) {
            const relativePath = path.relative(getScriptDir(), file);
            violations.push(`${relativePath}:${lineNumber} ${line.trim()}`);
          }
        }
      }
    } catch (error) {
      // Skip files we can't read
    }
  }
  
  if (violations.length > 0) {
    log('❌ Found logger calls with commas that should use template literals or concatenation:', 'red');
    violations.forEach(violation => log(violation, 'red'));
    log('\nPlease replace logger calls with commas with template literals or string concatenation.', 'yellow');
    log('Example: logger.error("Error message", { data }) should be logger.error(`Error message: ${JSON.stringify(data)}`)', 'yellow');
    return false;
  }
  
  log('✅ No logger calls with commas found', 'green');
  return true;
}

// Check for direct dotenv usage
function checkDirectDotenvUsage() {
  log('🔍 Checking for direct dotenv usage...', 'blue');
  
  const violations = [];
  const jsFiles = findJsFiles(getScriptDir());
  
  for (const file of jsFiles) {
    // Skip the centralized env config and lint scripts
    if (file.includes('config/env.js') || file.includes('lint-checks') || file.includes('setup-hooks')) {
      continue;
    }
    
    try {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNumber = i + 1;
        
        // Check for direct dotenv or dotenv-safe usage (excluding config/env.js)
        if (
          /require\s*\(\s*['"]dotenv['"]\s*\)/.test(line) ||
          /require\s*\(\s*['"]dotenv-safe['"]\s*\)/.test(line)
        ) {
          const relativePath = path.relative(getScriptDir(), file);
          violations.push(`${relativePath}:${lineNumber} ${line.trim()}`);
        }
      }
    } catch (error) {
      // Skip files we can't read
    }
  }
  
  if (violations.length > 0) {
    log('❌ Found direct dotenv usage that should use centralized config:', 'red');
    violations.forEach(violation => log(violation, 'red'));
    log('\nPlease use the centralized environment configuration instead:', 'yellow');
    log('Replace: require("dotenv") or require("dotenv-safe")', 'yellow');
    log('With: const env = require("./config/env")', 'yellow');
    log('\nThe centralized config is already set up in config/env.js', 'blue');
    return false;
  }
  
  log('✅ No direct dotenv usage found', 'green');
  return true;
}

function main() {
  log('🚀 Running cross-platform pre-commit lint checks...', 'blue');
  
  const consoleCheck = checkConsoleUsage();
  const commaCheck = checkLoggerCommas();
  const dotenvCheck = checkDirectDotenvUsage();
  
  if (consoleCheck && commaCheck && dotenvCheck) {
    log('✅ All checks passed!', 'green');
    process.exit(0);
  } else {
    log('❌ Pre-commit checks failed. Please fix the issues above before committing.', 'red');
    process.exit(1);
  }
}

main();
