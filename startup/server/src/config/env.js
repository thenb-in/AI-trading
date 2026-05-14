// Centralized environment configuration
const fs = require('fs');
const os = require('os');
const path = require('path');
const { PARSE_INT_RADIX } = require('../constants/standard_constants');
const { PRODUCTION_ENV } = require('../constants/standard_constants');


// This file sets up dotenv-safe once and exports the configuration
// IMPORTANT: dotenv must be initialized BEFORE we require the logger.
// logger.js reads process.env.NODE_ENV/LOG_LEVEL at module load time to set
// DEFAULT_LOG_LEVEL and decide whether to add the console transport.
// If we require logger before dotenv, NODE_ENV may be undefined and the logger
// will default to 'debug' and emit debug logs even in production.
// Resolve env files relative to the process CWD (the app boot dir), not the
// framework source dir, so each app boots against its own .env / .env.example.
require('dotenv-safe').config({
  allowEmptyValues: true,
  example: path.resolve(process.cwd(), '.env.example'),
  path: path.resolve(process.cwd(), '.env')
});

const logger = require('../../logger');

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
// Determine secure cookie setting: if SECURE_COOKIE is explicitly set, use that; otherwise default to true in production and false in development
const isSecureCookie = process.env.SECURE_COOKIE ? process.env.SECURE_COOKIE === 'True' || process.env.SECURE_COOKIE === 'true' : isProduction;
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

try {
  fs.mkdirSync(uploadsDir, { recursive: true });
} catch (err) {
  logger.error(`Failed to create UPLOADS_DIR at ${uploadsDir}`, err);
}

logger.info(`UPLOADS_DIR is set to: ${uploadsDir}`);

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

const PISCINA_MAX_THREADS = process.env.PISCINA_MAX_THREADS === '0' ? 0 : parseInt(process.env.PISCINA_MAX_THREADS, PARSE_INT_RADIX) || Math.max(1, os.cpus().length - 1);
const PISCINA_MIN_THREADS = process.env.PISCINA_MIN_THREADS === '0' ? 0 : parseInt(process.env.PISCINA_MIN_THREADS, PARSE_INT_RADIX) || Math.max(1, Math.floor(os.cpus().length / 2));

module.exports = {
  // Server configuration
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  SYNC_DB: process.env.SYNC_DB === 'true',
  FRONTEND_URL: process.env.FRONTEND_URL,
  SERVER_URL: process.env.SERVER_URL,
  APP_NAME: appName,
  SECURE_COOKIE: process.env.SECURE_COOKIE === 'true',

  // Database configuration
  DATABASE_URL: process.env.DATABASE_URL,
  DB_DIALECT: process.env.DB_DIALECT,
  // Connection string for Postgres dblink to the source HRMS DB
  DBLINK_CONNECTION: process.env.DBLINK_CONNECTION,

  // Sync configuration
  SYNC_TRANSACTION_BATCH_SIZE: parseInt(process.env.SYNC_TRANSACTION_BATCH_SIZE, PARSE_INT_RADIX) || 1000,
  SYNC_TRANSACTION_CRON: process.env.SYNC_TRANSACTION_CRON || '0 * * * * *',  // every hour at 0 min by default

  SYNC_TERMINAL_COMMANDS_BATCH_SIZE: parseInt(process.env.SYNC_TERMINAL_COMMANDS_BATCH_SIZE, PARSE_INT_RADIX) || 500,
  SYNC_TERMINAL_COMMANDS_CRON: process.env.SYNC_TERMINAL_COMMANDS_CRON || '*/10 * * * *', // Every 10 minutes by default

  // JWT configuration
  JWT_SECRET: process.env.JWT_SECRET,
  REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET,
  JWT_ACCESS_EXPIRATION: process.env.JWT_ACCESS_EXPIRATION,
  JWT_REFRESH_EXPIRATION: process.env.JWT_REFRESH_EXPIRATION,
  MAX_JWT_ACCESS_EXPIRATION_MS: parseInt(process.env.MAX_JWT_ACCESS_EXPIRATION_MS, PARSE_INT_RADIX) || 300000,   // 5 minutes
  MAX_JWT_REFRESH_EXPIRATION_MS: parseInt(process.env.MAX_JWT_REFRESH_EXPIRATION_MS, PARSE_INT_RADIX) || 604800000, // 7 days

  DEFAULT_COMPANY: process.env.DEFAULT_COMPANY,

  // File upload configuration
  UPLOADS_DIR: uploadsDir,

  // Secret directory configuration
  SECRET_DIR: secretDir,

  // Django API configuration
  EASYWDMS_INTERNAL_API_URL: process.env.INTERNAL_EASYWDMS_URL,
  EASYWDMS_EXTERNAL_API_URL: process.env.EXTERNAL_EASYWDMS_URL,

  //OPENROUTESERVICE_API_KEY
  OPENROUTESERVICE_API_KEY: process.env.OPENROUTESERVICE_API_KEY,

  // Face Detection API configuration
  FACE_API: process.env.FACE_API,

  // Terminal configuration
  TERMINAL_NAME: process.env.TERMINAL_NAME,
  // External services configuration
  WALLET_SERVER_URL: process.env.WALLET_SERVER_URL,

  // Piscina worker pool configuration
  // CPU-based defaults: leave 1 core for main thread; keep at least half of cores warm
  PISCINA_MAX_THREADS: PISCINA_MAX_THREADS,
  PISCINA_MIN_THREADS: PISCINA_MIN_THREADS,
  PISCINA_MAX_QUEUE: parseInt(process.env.PISCINA_MAX_QUEUE, PARSE_INT_RADIX) || 5000,
  PISCINA_IDLE_TIMEOUT: parseInt(process.env.PISCINA_IDLE_TIMEOUT, PARSE_INT_RADIX) || 30000,
  PISCINA_WORKER_DIR: process.env.PISCINA_WORKER_DIR || path.join(__dirname, '../workers'),

  // Helper functions
  isProduction,
  isSecureCookie,
  isDevelopment
};
