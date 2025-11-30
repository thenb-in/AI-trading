const { Client } = require('pg');
const logger = require('../../logger');
const { createPrompt, askQuestion } = require('./utils');

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

  // Check if we're in CI environment - use environment variables instead of prompts
  const isCI = process.env.CI === 'true' || process.env.CI === true;
  
  if (isCI) {
    logger.info('🔧 CI environment detected, using environment variables...');
    const dbHost = process.env.DB_HOST || 'localhost';
    const dbPort = process.env.DB_PORT || '5432';
    const dbName = process.env.DB_NAME || 'test_db';
    const dbUser = process.env.DB_USER || 'postgres';
    const dbPassword = process.env.DB_PASSWORD || 'postgres';

    // Validate and setup database
    const validation = await validateAndSetupDatabase(dbHost, dbPort, dbUser, dbPassword, dbName);

    if (validation.success) {
      const encodedUser = encodeURIComponent(dbUser);
      const encodedPassword = encodeURIComponent(dbPassword);
      const encodedDbName = encodeURIComponent(dbName);
      const databaseUrl = `postgresql://${encodedUser}:${encodedPassword}@${dbHost}:${dbPort}/${encodedDbName}`;

      logger.info('✅ Database configuration completed!');
      logger.info(`📊 Connection string: ${dbHost}:${dbPort}/${dbName}`);

      return { databaseUrl, dbHost, dbPort, dbName, dbUser, dbPassword };
    } else {
      logger.error(`❌ ${validation.error}`);
      return null;
    }
  }

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

module.exports = {
  testDatabaseConnection,
  checkDatabaseExists,
  createDatabase,
  validateAndSetupDatabase,
  configureDatabase
};

