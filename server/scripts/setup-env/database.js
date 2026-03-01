const path = require('path');
const { Client } = require('pg');
const logger = require('../../logger');
const { createPrompt, askQuestion } = require('./utils');

function getDefaultDbName() {
  try {
    const projectRoot = path.resolve(process.cwd(), '..');
    const folderName = path.basename(projectRoot);
    const dbName = folderName.trim().replace(/\s+/g, '_');
    if (!dbName) {
      logger.warn('Could not derive default DB name from folder; falling back to nbnext_db');
      return 'nbnext_db';
    }
    return dbName;
  } catch (error) {
    logger.warn(`Error deriving default DB name from folder: ${error.message}`);
    return 'nbnext_db';
  }
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
  // Step 1: Test connection to the user-supplied database first (user may only have access to this DB)
  logger.info('🔌 Testing database connection...');
  const targetDbTest = await testDatabaseConnection(dbHost, dbPort, dbUser, dbPassword, dbName);

  if (targetDbTest.success) {
    logger.info(`✅ Connection to database '${dbName}' successful!`);
    return { success: true, error: null };
  }

  // Step 2: Target DB connection failed - try connecting to 'postgres' to check/create target database
  logger.info(`🔌 Could not connect to '${dbName}'. Checking if database exists (connecting to postgres)...`);
  try {
    const dbExists = await checkDatabaseExists(dbHost, dbPort, dbUser, dbPassword, dbName);

    if (!dbExists) {
      logger.info(`📦 Database '${dbName}' not found. Creating new database...`);
      const createResult = await createDatabase(dbHost, dbPort, dbUser, dbPassword, dbName);

      if (!createResult.success) {
        return {
          success: false,
          error: `Failed to create database: ${createResult.error}. Also could not connect to existing database: ${targetDbTest.error}`
        };
      }

      logger.info(`✅ Database '${dbName}' created successfully!`);
    } else {
      logger.info(`✅ Database '${dbName}' already exists.`);
    }

    // Step 3: Test connection to the target database again
    logger.info(`🔌 Testing connection to database '${dbName}'...`);
    const retryTest = await testDatabaseConnection(dbHost, dbPort, dbUser, dbPassword, dbName);

    if (!retryTest.success) {
      return {
        success: false,
        error: `Failed to connect to database '${dbName}': ${retryTest.error}`
      };
    }

    logger.info(`✅ Connection to database '${dbName}' successful!`);
    return { success: true, error: null };
  } catch (error) {
    return {
      success: false,
      error: `Failed to connect to database '${dbName}': ${targetDbTest.error}. If your user only has access to this database, ensure it exists and credentials are correct.`
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
  const defaultDbName = getDefaultDbName();
  let lastEntered = {
    dbHost: 'localhost',
    dbPort: '5432',
    dbName: defaultDbName,
    dbUser: 'postgres',
    dbPassword: ''
  };

  while (true) {
    try {
      // Create prompt if it doesn't exist or was closed
      if (!prompt) {
        prompt = createPrompt();
      }

      // Database host (use last entered as default on retry)
      const dbHost = await askQuestion(prompt, 'Database host', lastEntered.dbHost);

      // Database port
      const dbPort = await askQuestion(prompt, 'Database port', lastEntered.dbPort);

      // Database name
      const dbName = await askQuestion(prompt, 'Database name', lastEntered.dbName);

      // Database username
      const dbUser = await askQuestion(prompt, 'Database username', lastEntered.dbUser);

      // Database password
      const dbPassword = await askQuestion(prompt, 'Database password', lastEntered.dbPassword);

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
        // Show error and ask user to retry; use current values as defaults next time
        lastEntered = { dbHost, dbPort, dbName, dbUser, dbPassword };
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

