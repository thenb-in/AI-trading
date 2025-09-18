#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');

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

function createPrompt() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

function askQuestion(prompt, question, defaultValue = '') {
  return new Promise((resolve) => {
    const defaultText = defaultValue ? ` (default: ${defaultValue})` : '';
    prompt.question(`${question}${defaultText}: `, (answer) => {
      resolve(answer.trim() || defaultValue);
    });
  });
}

async function checkEnvFile() {
  const envPath = path.join(process.cwd(), '.env');
  const envExamplePath = path.join(process.cwd(), '.env.example');

  if (!fs.existsSync(envExamplePath)) {
    log('❌ .env.example file not found!', 'red');
    log('Please create a .env.example file with all required environment variables.', 'yellow');
    return false;
  }

  if (!fs.existsSync(envPath)) {
    log('⚠️  .env file not found!', 'yellow');
    log('Creating .env file with interactive configuration...', 'blue');

    try {
      // Get database configuration from user
      const dbConfig = await configureDatabase();
      if (!dbConfig) {
        log('❌ Database configuration failed, using .env.example as fallback', 'red');
        const envExampleContent = fs.readFileSync(envExamplePath, 'utf8');
        fs.writeFileSync(envPath, envExampleContent);
        log('✅ .env file created from .env.example (fallback)', 'green');
        log('⚠️  Please update the .env file with your actual values!', 'yellow');
        return true;
      }

      // Generate JWT secrets
      const { accessSecret, refreshSecret } = generateSecrets();

      // Read .env.example and replace placeholders
      let envContent = fs.readFileSync(envExamplePath, 'utf8');

      // Replace database configuration
      envContent = envContent.replace(/DATABASE_URL=.*/g, `DATABASE_URL=${dbConfig.databaseUrl}`);

      // Add JWT secrets
      envContent = envContent.replace(/JWT_SECRET=.*/g, `JWT_SECRET=${accessSecret}`);
      envContent = envContent.replace(/REFRESH_TOKEN_SECRET=.*/g, `REFRESH_TOKEN_SECRET=${refreshSecret}`);

      // Set default frontend URL
      envContent = envContent.replace(/FRONTEND_URL=.*/g, 'FRONTEND_URL=http://localhost:5173');

      // Write the configured .env file
      fs.writeFileSync(envPath, envContent);

      log('✅ .env file created with your configuration!', 'green');
      log('🔐 JWT secrets have been generated and added', 'green');
      log('💡 You can modify these values later if needed', 'blue');

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

async function configureDatabase() {
  log('\n🗄️  Database Configuration', 'blue');
  log('Let\'s set up your database connection...', 'blue');

  const prompt = createPrompt();

  try {
    // Database host
    const dbHost = await askQuestion(prompt, 'Database host', 'localhost');

    // Database port
    const dbPort = await askQuestion(prompt, 'Database port', '5432');

    // Database name
    const dbName = await askQuestion(prompt, 'Database name', 'nbnext_db');

    // Database username
    const dbUser = await askQuestion(prompt, 'Database username', 'postgres');

    // Database password
    const dbPassword = await askQuestion(prompt, 'Database password', '');

    // Close the prompt
    prompt.close();

    // Build the DATABASE_URL
    const databaseUrl = `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}`;

    log('\n✅ Database configuration completed!', 'green');
    log(`📊 Connection string: ${dbHost}:${dbPort}/${dbName}`, 'blue');

    return { databaseUrl, dbHost, dbPort, dbName, dbUser, dbPassword };
  } catch (error) {
    prompt.close();
    log('❌ Error during database configuration:', 'red');
    log(error.message, 'red');
    return null;
  }
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

async function main() {
  const command = process.argv[2];

  try {
    switch (command) {
    case 'check':
      log('🔍 Checking environment setup...', 'blue');
      const envExists = await checkEnvFile();
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
      log('🚀 Setting up server environment...', 'blue');
      const setupEnvExists = await checkEnvFile();
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
      log('🔧 Environment Setup Script', 'blue');
      log('\nUsage:', 'yellow');
      log('  node scripts/setup-env.js check          - Check if .env file exists', 'blue');
      log('  node scripts/setup-env.js validate       - Validate environment variables', 'blue');
      log('  node scripts/setup-env.js generate-secrets - Generate JWT secrets', 'blue');
      log('  node scripts/setup-env.js setup          - Setup or validate environment', 'blue');
      break;
    }
  } catch (error) {
    log('❌ An error occurred:', 'red');
    log(error.message, 'red');
    process.exit(1);
  }
}

main();
