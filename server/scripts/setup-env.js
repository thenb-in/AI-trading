#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');
const { Client } = require('pg');
const logger = require('../logger');


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
    logger.error('❌ .env.example file not found!');
    logger.warn('Please create a .env.example file with all required environment variables.');
    return false;
  }

  if (!fs.existsSync(envPath)) {
    logger.warn('⚠️  .env file not found!');
    logger.info('Creating .env file with interactive configuration...');

    try {
      // Get database configuration from user
      const dbConfig = await configureDatabase();
      if (!dbConfig) {
        logger.error('❌ Database configuration failed, using .env.example as fallback');
        const envExampleContent = fs.readFileSync(envExamplePath, 'utf8');
        fs.writeFileSync(envPath, envExampleContent);
        logger.info('✅ .env file created from .env.example (fallback)');
        logger.warn('⚠️  Please update the .env file with your actual values!');
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

      logger.info('✅ .env file created with your configuration!');
      logger.info('🔐 JWT secrets have been generated and added');
      logger.info('💡 You can modify these values later if needed');

      return true;
    } catch (error) {
      logger.error('❌ Failed to create .env file:');
      logger.error(error.message);
      return false;
    }
  }

  return true;
}

function validateEnvFile() {
  try {
    logger.info('🔍 Validating environment variables...');

    // This will throw an error if required variables are missing
    require('../src/config/env');

    logger.info('✅ All required environment variables are present!');
    return true;
  } catch (error) {
    logger.error('❌ Environment validation failed:');
    logger.error(error.message);
    return false;
  }
}

function generateSecrets() {
  logger.info('🔐 Generating secure JWT secrets...');

  const accessSecret = generateSecret();
  const refreshSecret = generateSecret();

  logger.info('✅ Generated JWT secrets:');
  logger.info(`JWT_SECRET=${accessSecret}`);
  logger.info(`REFRESH_TOKEN_SECRET=${refreshSecret}`);
  logger.info('💡 Copy these to your .env file!');

  return { accessSecret, refreshSecret };
}

async function testDatabaseConnection(dbHost, dbPort, dbUser, dbPassword, dbName = 'postgres') {
  const client = new Client({
    host: dbHost,
    port: parseInt(dbPort, 10),
    user: dbUser,
    password: dbPassword,
    database: dbName
  });

  try {
    await client.connect();
    await client.end();
    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function checkDatabaseExists(dbHost, dbPort, dbUser, dbPassword, dbName) {
  const client = new Client({
    host: dbHost,
    port: parseInt(dbPort, 10),
    user: dbUser,
    password: dbPassword,
    database: 'postgres'
  });

  try {
    await client.connect();
    const result = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [dbName]
    );
    await client.end();
    return result.rows.length > 0;
  } catch (error) {
    if (client) {
      try {
        await client.end();
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    throw error;
  }
}

async function createDatabase(dbHost, dbPort, dbUser, dbPassword, dbName) {
  const client = new Client({
    host: dbHost,
    port: parseInt(dbPort, 10),
    user: dbUser,
    password: dbPassword,
    database: 'postgres'
  });

  try {
    await client.connect();
    // Escape database name to prevent SQL injection
    const escapedDbName = `"${dbName.replace(/"/g, '""')}"`;
    await client.query(`CREATE DATABASE ${escapedDbName}`);
    await client.end();
    return { success: true, error: null };
  } catch (error) {
    if (client) {
      try {
        await client.end();
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    return { success: false, error: error.message };
  }
}

async function validateAndSetupDatabase(dbHost, dbPort, dbUser, dbPassword, dbName) {
  // Step 1: Test connection to PostgreSQL server (connect to default 'postgres' database)
  logger.info('🔌 Testing database connection...');
  const connectionTest = await testDatabaseConnection(dbHost, dbPort, dbUser, dbPassword, 'postgres');
  
  if (!connectionTest.success) {
    return {
      success: false,
      error: `Failed to connect to PostgreSQL server: ${connectionTest.error}`
    };
  }

  logger.info('✅ Database connection successful!');

  // Step 2: Check if target database exists
  logger.info(`🔍 Checking if database '${dbName}' exists...`);
  try {
    const dbExists = await checkDatabaseExists(dbHost, dbPort, dbUser, dbPassword, dbName);
    
    if (!dbExists) {
      logger.info(`📦 Database '${dbName}' not found. Creating new database...`);
      const createResult = await createDatabase(dbHost, dbPort, dbUser, dbPassword, dbName);
      
      if (!createResult.success) {
        return {
          success: false,
          error: `Failed to create database: ${createResult.error}`
        };
      }
      
      logger.info(`✅ Database '${dbName}' created successfully!`);
    } else {
      logger.info(`✅ Database '${dbName}' already exists.`);
    }

    // Step 3: Test connection to the target database
    logger.info(`🔌 Testing connection to database '${dbName}'...`);
    const targetDbTest = await testDatabaseConnection(dbHost, dbPort, dbUser, dbPassword, dbName);
    
    if (!targetDbTest.success) {
      return {
        success: false,
        error: `Failed to connect to target database '${dbName}': ${targetDbTest.error}`
      };
    }

    logger.info(`✅ Connection to database '${dbName}' successful!`);

    return { success: true, error: null };
  } catch (error) {
    return {
      success: false,
      error: `Database validation error: ${error.message}`
    };
  }
}

async function configureDatabase() {
  logger.info('🗄️  Database Configuration');
  logger.info('Let\'s set up your database connection...');

  let prompt = null;

  while (true) {
    try {
      // Create prompt if it doesn't exist or was closed
      if (!prompt) {
        prompt = createPrompt();
      }

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

      // Validate and setup database (test connection, check existence, create if needed)
      const validation = await validateAndSetupDatabase(dbHost, dbPort, dbUser, dbPassword, dbName);

      if (validation.success) {
        // Close the prompt only on success
        prompt.close();

        // Build the DATABASE_URL with URL-encoded credentials to handle special characters
        const encodedUser = encodeURIComponent(dbUser);
        const encodedPassword = encodeURIComponent(dbPassword);
        const encodedDbName = encodeURIComponent(dbName);
        const databaseUrl = `postgresql://${encodedUser}:${encodedPassword}@${dbHost}:${dbPort}/${encodedDbName}`;

        logger.info('✅ Database configuration completed!');
        logger.info(`📊 Connection string: ${dbHost}:${dbPort}/${dbName}`);

        return { databaseUrl, dbHost, dbPort, dbName, dbUser, dbPassword };
      } else {
        // Show error and ask user to retry
        logger.error(`❌ ${validation.error}`);
        logger.warn('⚠️  Please check your database credentials and try again.');
        logger.info('');

        // Continue the loop to ask again
        continue;
      }
    } catch (error) {
      if (prompt) {
        prompt.close();
      }
      logger.error('❌ Error during database configuration:');
      logger.error(error.message);
      return null;
    }
  }
}

function showSetupInstructions() {
  logger.info('📋 Environment Setup Instructions:');
  logger.debug('1. Copy .env.example to .env:');
  logger.debug('   cp .env.example .env');
  logger.info('2. Update .env with your values:');
  logger.debug('   - Set DATABASE_URL to your PostgreSQL connection string');
  logger.debug('   - Generate and set JWT_SECRET and REFRESH_TOKEN_SECRET');
  logger.debug('   - Update FRONTEND_URL to match your frontend server');
  logger.info('3. Generate JWT secrets:');
  logger.debug('   npm run generate-secrets');
  logger.info('4. Validate environment:');
  logger.debug('   npm run validate-env');
}

async function main() {
  const command = process.argv[2];

  try {
    switch (command) {
    case 'check':
      logger.info('🔍 Checking environment setup...');
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
      logger.info('🚀 Setting up server environment...');
      const setupEnvExists = await checkEnvFile();
      if (setupEnvExists) {
        logger.info('✅ Environment file already exists, validating configuration...');
        const isValid = validateEnvFile();
        if (isValid) {
          logger.info('🎉 Environment is properly configured!');
          logger.info('💡 Use "npm run validate-env" for quick validation in the future.');
        } else {
          logger.warn('⚠️  Environment validation failed. Please check your .env file.');
          showSetupInstructions();
        }
      } else {
        showSetupInstructions();
      }
      break;

    default:
      logger.info('🔧 Environment Setup Script');
      logger.warn('Usage:');
      logger.info('  node scripts/setup-env.js check          - Check if .env file exists');
      logger.info('  node scripts/setup-env.js validate       - Validate environment variables');
      logger.info('  node scripts/setup-env.js generate-secrets - Generate JWT secrets');
      logger.info('  node scripts/setup-env.js setup          - Setup or validate environment');
      break;
    }
  } catch (error) {
    logger.error('❌ An error occurred:');
    logger.error(error.message);
    process.exit(1);
  }
}

main();
