// Centralized environment configuration
const fs = require('fs');
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
// OIDC provider cookies go secure in production, or when explicitly forced for a
// TLS-terminated non-production deployment. Mirrors the SECURE_COOKIE handling above.
const isOidcSecureCookie = isProduction
  || process.env.OIDC_SECURE_COOKIES === 'True'
  || process.env.OIDC_SECURE_COOKIES === 'true';

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

module.exports = {
  // Server configuration
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  SYNC_DB: process.env.SYNC_DB === 'true',
  // Empty string when unset, so callers can normalise it (.replace(/\/$/, ''))
  // without a guard and still treat it as falsy for "is the SPA on its own origin".
  FRONTEND_URL: process.env.FRONTEND_URL || '',
  SERVER_URL: process.env.SERVER_URL,
  APP_NAME: appName || 'unknown-app',
  SECURE_COOKIE: process.env.SECURE_COOKIE === 'true',
  LOG_LEVEL: process.env.LOG_LEVEL,

  // Database configuration
  DATABASE_URL: process.env.DATABASE_URL,
  DB_DIALECT: process.env.DB_DIALECT,

  // JWT configuration
  JWT_SECRET: process.env.JWT_SECRET,
  REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET,
  JWT_ACCESS_EXPIRATION: process.env.JWT_ACCESS_EXPIRATION,
  JWT_REFRESH_EXPIRATION: process.env.JWT_REFRESH_EXPIRATION,
  MAX_JWT_ACCESS_EXPIRATION_MS: parseInt(process.env.MAX_JWT_ACCESS_EXPIRATION_MS, PARSE_INT_RADIX) || 300000,   // 5 minutes
  MAX_JWT_REFRESH_EXPIRATION_MS: parseInt(process.env.MAX_JWT_REFRESH_EXPIRATION_MS, PARSE_INT_RADIX) || 604800000, // 7 days

  DEFAULT_COMPANY: process.env.DEFAULT_COMPANY,


  TOTP_ISSUER: process.env.TOTP_ISSUER || appName,
  TOTP_WINDOW: parseInt(process.env.TOTP_WINDOW, PARSE_INT_RADIX) || 1,

  // Report runner
  REPORT_RUNNER_URL: process.env.REPORT_RUNNER_URL,
  REPORT_RUNNER_PORT: parseInt(process.env.REPORT_RUNNER_PORT, PARSE_INT_RADIX) || 8945,
  REPORT_RUNNER_HOST: process.env.REPORT_RUNNER_HOST || '0.0.0.0',
  // How many saved report runs the runner computes at once. Saved runs finish in
  // the background so they queue; the synchronous path is not bounded by this.
  REPORT_RUNNER_CONCURRENCY: parseInt(process.env.REPORT_RUNNER_CONCURRENCY, PARSE_INT_RADIX) || 2,
  // Connection string for Postgres dblink to the source HRMS DB, read by the
  // sync_transaction scheduler.
  DBLINK_CONNECTION: process.env.DBLINK_CONNECTION,

  // License configuration
  // License enforcement follows SECURE_COOKIE: a non-secure-cookie install is
  // treated as local/dev and bypasses the gate; secure cookies enforce it.
  // LICENSE_AUTO_RENEW=false disables the
  // hourly auto-renew cron job (use for airgap installs where you don't
  // want repeated phone-home attempts to the wallet logged as failures).
  // LICENSE_WALLET_PUBLIC_KEYS is a JSON array of PEM strings; if set,
  // it overrides the pinned public keys file under SECRET_DIR.
  // Defaults are 'true' so production fails closed if the env var is unset.
  LICENSE_AUTO_RENEW: process.env.LICENSE_AUTO_RENEW || 'true',
  LICENSE_WALLET_PUBLIC_KEYS: process.env.LICENSE_WALLET_PUBLIC_KEYS,

  // File upload configuration
  UPLOADS_DIR: uploadsDir,

  // Secret directory configuration
  SECRET_DIR: secretDir,

  // External services configuration
  WALLET_SERVER_URL: process.env.WALLET_SERVER_URL,
  // Optional: used by migrate:sso-users CLI (eTime → Wallet accounts).
  WALLET_DATABASE_URL: process.env.WALLET_DATABASE_URL,

  // OIDC RP / Wallet SSO (ADR 001)
  OIDC_ISSUER: process.env.OIDC_ISSUER,
  // Wallet Application.app_key. One value, two uses: the OIDC client_id on the
  // wire, and the key identifying this app when pushing subscriptions to Wallet.
  APP_KEY: process.env.APP_KEY,
  OIDC_CLIENT_SECRET: process.env.OIDC_CLIENT_SECRET,
  OIDC_REDIRECT_URI: process.env.OIDC_REDIRECT_URI,
  OIDC_SCOPES: process.env.OIDC_SCOPES || 'openid profile offline_access',
  OIDC_POST_LOGOUT_REDIRECT_URI: process.env.OIDC_POST_LOGOUT_REDIRECT_URI || process.env.FRONTEND_URL,

  // Helper functions
  isProduction,
  isSecureCookie,
  isOidcSecureCookie,
  isDevelopment,



  // local installs
  // Path to the built client bundle; resolved against process.cwd() at use.
  CLIENT_STATIC_DIR: process.env.CLIENT_STATIC_DIR || '../client',



  // CI/tests - Non-interactive create_company script credentials (scripted runs).
  SADMIN_USERNAME: process.env.SADMIN_USERNAME,
  SADMIN_PASSWORD: process.env.SADMIN_PASSWORD

};
