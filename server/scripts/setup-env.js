#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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

function generateSecret(length = 64) {
  return crypto.randomBytes(length).toString('hex');
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
  }
  
  return true;
}

function validateEnvFile() {
  try {
    log('🔍 Validating environment variables...', 'blue');
    
    // This will throw an error if required variables are missing
    require('../config/env');
    
    log('✅ All required environment variables are present!', 'green');
    return true;
  } catch (error) {
    log('❌ Environment validation failed:', 'red');
    log(error.message, 'red');
    return false;
  }
}

function generateSecrets() {
  log('🔐 Generating secure JWT secrets...', 'blue');
  
  const accessSecret = generateSecret();
  const refreshSecret = generateSecret();
  
  log('✅ Generated JWT secrets:', 'green');
  log(`JWT_SECRET=${accessSecret}`, 'blue');
  log(`REFRESH_TOKEN_SECRET=${refreshSecret}`, 'blue');
  log('\n💡 Copy these to your .env file!', 'yellow');
  
  return { accessSecret, refreshSecret };
}

function showSetupInstructions() {
  log('\n📋 Environment Setup Instructions:', 'blue');
  log('1. Copy .env.example to .env:', 'yellow');
  log('   cp .env.example .env', 'blue');
  log('\n2. Update .env with your values:', 'yellow');
  log('   - Set DATABASE_URL to your PostgreSQL connection string', 'blue');
  log('   - Generate and set JWT_SECRET and REFRESH_TOKEN_SECRET', 'blue');
  log('   - Update FRONTEND_URL to match your frontend server', 'blue');
  log('\n3. Generate JWT secrets:', 'yellow');
  log('   npm run generate-secrets', 'blue');
  log('\n4. Validate environment:', 'yellow');
  log('   npm run validate-env', 'blue');
}

function main() {
  const command = process.argv[2];
  
  switch (command) {
    case 'check':
      log('🔍 Checking environment setup...', 'blue');
      const envExists = checkEnvFile();
      if (envExists) {
        validateEnvFile();
      }
      break;
      
    case 'generate-secrets':
      generateSecrets();
      break;
      
    case 'validate':
      validateEnvFile();
      break;
      
    case 'setup':
      log('🚀 Setting up environment...', 'blue');
      checkEnvFile();
      showSetupInstructions();
      break;
      
    default:
      log('🔧 Environment Setup Script', 'blue');
      log('\nUsage:', 'yellow');
      log('  node scripts/setup-env.js check          - Check if .env file exists', 'blue');
      log('  node scripts/setup-env.js validate       - Validate environment variables', 'blue');
      log('  node scripts/setup-env.js generate-secrets - Generate JWT secrets', 'blue');
      log('  node scripts/setup-env.js setup          - Show setup instructions', 'blue');
      break;
  }
}

main();
