// Centralized environment configuration
const fs = require('fs');
const path = require('path');
const logger = require('../../logger');
const { PARSE_INT_RADIX } = require('../constants/startup/standard_constants');
const { PRODUCTION_ENV } = require('../constants/startup/standard_constants');


// This file sets up dotenv-safe once and exports the configuration
require('dotenv-safe').config({
  allowEmptyValues: true,
  example: '.env.example'
});

// App name from server package.json (fallback if read fails)
let appName = 'NB Next';
if (process.env.APP_NAME) {
  appName = process.env.APP_NAME;
} else {
  try {
    const packageJsonPath = path.resolve(__dirname, '../../package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    if (packageJson.name) {
      appName = packageJson.name;
    }
  } catch (error) {
    logger.warn(`Could not read app name from package.json: ${error.message}`);
  }
}


// Export the configuration for use in other files
const isProduction = process.env.NODE_ENV === PRODUCTION_ENV;
const isDevelopment = !isProduction;

// Calculate default uploads directory relative to server root
// env.js is at server/src/config/env.js, so we go up 3 levels to base root
const defaultUploadsDir = path.resolve(__dirname, '../../../uploads');

// Handle UPLOADS_DIR: if set, use it (resolve if relative), otherwise use default
let uploadsDir = process.env.UPLOADS_DIR;
if (uploadsDir) {
  // If provided, resolve to absolute path (handles both absolute and relative)
  uploadsDir = path.isAbsolute(uploadsDir) ? uploadsDir : path.resolve(__dirname, uploadsDir);
} else {
  // Use default path
  uploadsDir = defaultUploadsDir;
}

// Calculate default secret directory relative to server root
const defaultSecretDir = path.resolve(__dirname, '../../secret');

// Handle SECRET_DIR: if set, use it (resolve if relative), otherwise use default
let secretDir = process.env.SECRETS_PATH;
if (secretDir) {
  // If provided, resolve to absolute path (handles both absolute and relative)
  secretDir = path.isAbsolute(secretDir) ? secretDir : path.resolve(__dirname, secretDir);
  logger.info(`SECRET_DIR is set to: ${secretDir}`);
} else {
  // Use default path
  secretDir = defaultSecretDir;
  logger.info(`SECRET_DIR is set to default: ${secretDir}`);
}

module.exports = {
  // Server configuration
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  FRONTEND_URL: process.env.FRONTEND_URL,
  SERVER_URL: process.env.SERVER_URL,
  APP_NAME: appName,

  // Database configuration
  DATABASE_URL: process.env.DATABASE_URL,
  DB_DIALECT: process.env.DB_DIALECT,

  // JWT configuration
  JWT_SECRET: process.env.JWT_SECRET,
  REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET,
  JWT_ACCESS_EXPIRATION: process.env.JWT_ACCESS_EXPIRATION,
  JWT_REFRESH_EXPIRATION: process.env.JWT_REFRESH_EXPIRATION,
  MAX_JWT_ACCESS_EXPIRATION_MS: parseInt(process.env.MAX_JWT_ACCESS_EXPIRATION_MS, PARSE_INT_RADIX),
  MAX_JWT_REFRESH_EXPIRATION_MS: parseInt(process.env.MAX_JWT_REFRESH_EXPIRATION_MS, PARSE_INT_RADIX),


  // TOTP Constants
  TOTP_ISSUER: process.env.TOTP_ISSUER || appName,
  TOTP_CODE_LENGTH: parseInt(process.env.TOTP_CODE_LENGTH, PARSE_INT_RADIX),
  TOTP_WINDOW: parseInt(process.env.TOTP_WINDOW, PARSE_INT_RADIX),



  DEFAULT_COMPANY: process.env.DEFAULT_COMPANY,

  // External services configuration
  WALLET_SERVER_URL: process.env.WALLET_SERVER_URL,

  // File upload configuration
  UPLOADS_DIR: uploadsDir,

  // Secret directory configuration
  SECRET_DIR: secretDir,

  // Helper functions
  isProduction,
  isDevelopment
};
