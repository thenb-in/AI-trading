const fs = require('fs');
const path = require('path');
const logger = require('../../logger');
const { configureDatabase } = require('./database');
const { generateSecrets } = require('./secrets');

async function checkEnvFile() {
  const envPath = path.join(process.cwd(), '.env');
  const envExamplePath = path.join(process.cwd(), '.env.example');

  if (!fs.existsSync(envExamplePath)) {
    logger.error(`❌ .env.example file not found!`);
    logger.warn(`Please create a .env.example file with all required environment variables.`);
    return false;
  }

  if (!fs.existsSync(envPath)) {
    logger.warn(`⚠️  .env file not found!`);
    logger.info(`Creating .env file with interactive configuration...`);

    try {
      // Get database configuration from user
      const dbConfig = await configureDatabase();
      if (!dbConfig) {
        logger.error(`❌ Database configuration failed, using .env.example as fallback`);
        const envExampleContent = fs.readFileSync(envExamplePath, 'utf8');
        fs.writeFileSync(envPath, envExampleContent);
        logger.info(`✅ .env file created from .env.example (fallback)`);
        logger.warn(`⚠️  Please update the .env file with your actual values!`);
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

      logger.info(`✅ .env file created with your configuration!`);
      logger.info(`🔐 JWT secrets have been generated and added`);
      logger.info(`💡 You can modify these values later if needed`);

      return true;
    } catch (error) {
      logger.error(`❌ Failed to create .env file: ${error.message}`, error);
      return false;
    }
  }

  return true;
}

function validateEnvFile() {
  try {
    logger.info(`🔍 Validating environment variables...`);

    // This will throw an error if required variables are missing
    require('../../src/config/env');

    logger.info(`✅ All required environment variables are present!`);
    return true;
  } catch (error) {
    logger.error(`❌ Environment validation failed: ${error.message}`, error);
    return false;
  }
}

module.exports = {
  checkEnvFile,
  validateEnvFile
};

