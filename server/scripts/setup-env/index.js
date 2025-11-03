#!/usr/bin/env node

const logger = require('../../logger');
const { checkEnvFile, validateEnvFile } = require('./env');
const { generateSecrets } = require('./secrets');
const { showSetupInstructions } = require('./instructions');

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

