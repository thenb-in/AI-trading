#!/usr/bin/env node

// This script runs standalone (via `node .../setup-env/index.js`) BEFORE the
// server boots, so unlike app/server/index.js it never gets a chance to register
// module-alias / addPath(). The logger lives in the foundational `basics`
// package and does a bare `require('winston')`, but winston is installed only in
// startup/server/node_modules (shared across the monorepo, not duplicated into
// basics). Bootstrap those shared node_modules onto the resolution path here so
// `require('../../logger')` below — and everything it pulls in — can find winston.
const path = require('path');
const sharedModulePaths = [
  path.join(__dirname, '../../node_modules'), // startup/server/node_modules (winston lives here)
  path.join(__dirname, '../../../app/server/node_modules'),
  path.join(__dirname, '../../../basics/node_modules'),
  path.join(__dirname, '../../../node_modules') // repo root
];
process.env.NODE_PATH = [...sharedModulePaths, process.env.NODE_PATH]
  .filter(Boolean)
  .join(path.delimiter);
require('module').Module._initPaths();

const logger = require('../../logger');
const { checkEnvFile, validateEnvFile } = require('./env');
const { generateSecrets } = require('./secrets');
const { showSetupInstructions } = require('./instructions');

async function main() {
  const command = process.argv[2];

  try {
    switch (command) {
    case 'check':
      logger.info(`🔍 Checking environment setup...`);
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
      logger.info(`🚀 Setting up server environment...`);
      const setupEnvExists = await checkEnvFile();
      if (setupEnvExists) {
        logger.info(`✅ Environment file already exists, validating configuration...`);
        const isValid = validateEnvFile();
        if (isValid) {
          logger.info(`🎉 Environment is properly configured!`);
          logger.info(`💡 Use "npm run validate-env" for quick validation in the future.`);
        } else {
          logger.warn(`⚠️  Environment validation failed. Please check your .env file.`);
          showSetupInstructions();
        }
      } else {
        showSetupInstructions();
      }
      break;

    default:
      logger.info(`🔧 Environment Setup Script`);
      logger.warn(`Usage:`);
      logger.info(`  node scripts/setup-env.js check          - Check if .env file exists`);
      logger.info(`  node scripts/setup-env.js validate       - Validate environment variables`);
      logger.info(`  node scripts/setup-env.js generate-secrets - Generate JWT secrets`);
      logger.info(`  node scripts/setup-env.js setup          - Setup or validate environment`);
      break;
    }
  } catch (error) {
    logger.error(`❌ An error occurred: ${error.message}`, error);
    process.exit(1);
  }
}

main();

