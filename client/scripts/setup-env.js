#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

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

function checkEnvFile() {
  const envPath = path.join(process.cwd(), '.env');
  const envExamplePath = path.join(process.cwd(), '.env.example');
  
  if (!fs.existsSync(envExamplePath)) {
    log('❌ .env.example file not found!', 'red');
    log('Please create a .env.example file with all required environment variables.', 'yellow');
    return false;
  }
  
  if (!fs.existsSync(envPath)) {
    log('⚠️  .env file not found!', 'yellow');
    log('Creating .env file from .env.example...', 'blue');
    
    try {
      const envExampleContent = fs.readFileSync(envExamplePath, 'utf8');
      fs.writeFileSync(envPath, envExampleContent);
      log('✅ .env file created from .env.example', 'green');
      log('⚠️  Please update the .env file with your actual values!', 'yellow');
      return true;
    } catch (error) {
      log('❌ Failed to create .env file:', 'red');
      log(error.message, 'red');
      return false;
    }
  } else {
    log('✅ .env file already exists', 'green');
  }
  
  return true;
}

function validateEnvFile() {
  try {
    log('🔍 Validating environment variables...', 'blue');
    
    const envPath = path.join(process.cwd(), '.env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    // Check for required Vite environment variables
    const requiredVars = [];
    const missingVars = [];
    
    requiredVars.forEach(varName => {
      if (!envContent.includes(varName)) {
        missingVars.push(varName);
      }
    });
    
    if (missingVars.length > 0) {
      log('❌ Missing required environment variables:', 'red');
      missingVars.forEach(varName => {
        log(`   - ${varName}`, 'red');
      });
      return false;
    }
    
    log('✅ All required environment variables are present!', 'green');
    return true;
  } catch (error) {
    log('❌ Environment validation failed:', 'red');
    log(error.message, 'red');
    return false;
  }
}

function showSetupInstructions() {
  log('\n📋 Frontend Environment Setup Instructions:', 'blue');
  log('1. Copy .env.example to .env:', 'yellow');
  log('   cp .env.example .env', 'blue');
  log('\n2. Update .env with your values:', 'yellow');
  log('   - Set VITE_PROXY_URL to your backend server URL', 'blue');
  log('   - Update PORT if you want to use a different port', 'blue');
  log('\n3. Important notes:', 'yellow');
  log('   - All variables must be prefixed with VITE_ to be accessible in the browser', 'blue');
  log('   - Vite automatically loads .env files', 'blue');
  log('   - Never commit .env files to version control', 'blue');
  log('\n4. Validate environment:', 'yellow');
  log('   npm run validate-env', 'blue');
}

function main() {
  const command = process.argv[2];
  
  switch (command) {
    case 'check':
      log('🔍 Checking frontend environment setup...', 'blue');
      const envExists = checkEnvFile();
      if (envExists) {
        validateEnvFile();
      }
      break;
      
    case 'validate':
      validateEnvFile();
      break;
      
    case 'setup':
      log('🚀 Setting up frontend environment...', 'blue');
      const setupEnvExists = checkEnvFile();
      if (setupEnvExists) {
        log('✅ Environment file already exists, validating configuration...', 'green');
        const isValid = validateEnvFile();
        if (isValid) {
          log('\n🎉 Environment is properly configured!', 'green');
          log('💡 Use "npm run validate-env" for quick validation in the future.', 'blue');
        } else {
          log('\n⚠️  Environment validation failed. Please check your .env file.', 'yellow');
          showSetupInstructions();
        }
      } else {
        showSetupInstructions();
      }
      break;
      
    default:
      log('🔧 Frontend Environment Setup Script', 'blue');
      log('\nUsage:', 'yellow');
      log('  node scripts/setup-env.js check          - Check if .env file exists', 'blue');
      log('  node scripts/setup-env.js validate       - Validate environment variables', 'blue');
      log('  node scripts/setup-env.js setup          - Setup or validate environment', 'blue');
      break;
  }
}

main();
