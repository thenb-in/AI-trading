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
// env.js is at startup/server/src/config/env.js, so we go up 4 levels to base root
const defaultUploadsDir = path.resolve(__dirname, '../../../../uploads');

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
  APP_NAME: appName || 'unknown-app',
  SECURE_COOKIE: process.env.SECURE_COOKIE === 'true',
  LOG_LEVEL: process.env.LOG_LEVEL,

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

  // Report runner
  REPORT_RUNNER_URL: process.env.REPORT_RUNNER_URL,
  REPORT_RUNNER_PORT: parseInt(process.env.REPORT_RUNNER_PORT, PARSE_INT_RADIX) || 4001,
  REPORT_RUNNER_HOST: process.env.REPORT_RUNNER_HOST || '0.0.0.0',

  // License configuration. Set LICENSE_ENFORCEMENT=false in dev to bypass
  // the license gate entirely. LICENSE_AUTO_RENEW=false disables the
  // hourly auto-renew cron job (use for airgap installs where you don't
  // want repeated phone-home attempts to the wallet logged as failures).
  // LICENSE_WALLET_PUBLIC_KEYS is a JSON array of PEM strings; if set,
  // it overrides the pinned public keys file under SECRET_DIR.
  // Defaults are 'true' so production fails closed if the env var is unset.
  LICENSE_ENFORCEMENT: process.env.LICENSE_ENFORCEMENT || 'true',
  LICENSE_AUTO_RENEW: process.env.LICENSE_AUTO_RENEW || 'true',
  LICENSE_WALLET_PUBLIC_KEYS: process.env.LICENSE_WALLET_PUBLIC_KEYS,

  // File upload configuration
  UPLOADS_DIR: uploadsDir,

  // Secret directory configuration
  SECRET_DIR: secretDir,

  // Django API configuration
  EASYWDMS_INTERNAL_API_URL: process.env.INTERNAL_EASYWDMS_URL,
  EASYWDMS_EXTERNAL_API_URL: process.env.EXTERNAL_EASYWDMS_URL,

  //OPENROUTESERVICE_API_KEY
  OPENROUTESERVICE_API_KEY: process.env.OPENROUTESERVICE_API_KEY,

  // Razorpay (self-serve onboarding checkout). KEY_ID is public (sent to the
  // browser to open the modal); KEY_SECRET is server-only and must NEVER reach
  // the client. RAZORPAY_DEFAULT_AMOUNT is the order amount in paise used while
  // plans have no per-plan price column yet (sync runs alter:false).
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
  RAZORPAY_DEFAULT_AMOUNT: parseInt(process.env.RAZORPAY_DEFAULT_AMOUNT, PARSE_INT_RADIX) || 49900,
  // Razorpay webhook signing secret (Dashboard → Settings → Webhooks). Required
  // for the server-to-server payment.captured event that makes provisioning
  // resilient to the browser dying after payment. When unset, the webhook
  // endpoint rejects calls and the reconcile cron still acts as the safety net.
  RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET,
  // Reconcile sweep: refunds any order captured but not provisioned. Cron cadence,
  // the grace window before an open order is examined, and the age after which an
  // un-paid (abandoned) order is marked failed.
  ONBOARDING_RECONCILE_CRON: process.env.ONBOARDING_RECONCILE_CRON || '*/15 * * * *',
  ONBOARDING_ORDER_GRACE_MINUTES:
    parseInt(process.env.ONBOARDING_ORDER_GRACE_MINUTES, PARSE_INT_RADIX) || 15,
  ONBOARDING_ORDER_EXPIRY_MINUTES:
    parseInt(process.env.ONBOARDING_ORDER_EXPIRY_MINUTES, PARSE_INT_RADIX) || 1440,

  // Face Detection API configuration
  FACE_API: process.env.FACE_API,

  // Terminal configuration
  TERMINAL_NAME: process.env.TERMINAL_NAME,
  // External services configuration
  WALLET_SERVER_URL: process.env.WALLET_SERVER_URL,

  // whatsapp-sender app. WHATSAPP_SENDER_URL
  WHATSAPP_SENDER_URL: (process.env.WHATSAPP_SENDER_URL || '').trim() || null,
  WHATSAPP_SENDER_APP_KEY: (process.env.WHATSAPP_SENDER_APP_KEY || '').trim() || null,

  // Django OAuth introspection
  DJANGO_AUTH_URL: process.env.DJANGO_AUTH_URL,

  // Shared secret guarding the internal service-to-service API
  // (/internal). The standalone biometric gateways send it in the
  // `x-internal-secret` header; when unset (local/dev) the check is skipped.
  MAIN_APP_INTERNAL_SECRET: process.env.MAIN_APP_INTERNAL_SECRET,

  // ADMS coalesce windows. See biometric_gateway/adms_server/src/constants/adms.js
  // for the rationale behind each window. Env-overridable for tests.
  ADMS_REFRESH_QUERY_COALESCE_MS:
    Number(process.env.ADMS_REFRESH_QUERY_COALESCE_MS) || 30 * 1000,
  ADMS_FANOUT_COALESCE_MS:
    Number(process.env.ADMS_FANOUT_COALESCE_MS) || 30 * 1000,

  // checkin/checkout aggregator batch size. No default — the consumer
  // treats undefined as "no batching" and falls back to its own limit.
  EMPLOYEE_BATCH_SIZE: process.env.EMPLOYEE_BATCH_SIZE,

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
  isDevelopment,



  // local installs
  // Path to the built client bundle; resolved against process.cwd() at use.
  CLIENT_STATIC_DIR: process.env.CLIENT_STATIC_DIR || '../client',



  // CI/tests - Non-interactive create_company script credentials (scripted runs).
  SADMIN_USERNAME: process.env.SADMIN_USERNAME,
  SADMIN_PASSWORD: process.env.SADMIN_PASSWORD

};
