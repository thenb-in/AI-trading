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
const isOnPremDeployment = !isSecureCookie;


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

// Root of the standalone biometric gateway processes. The gateway-health probe
// discovers the gateway set here and reads each gateway's .env. Defaults to
// biometric_gateway/ at the repo root (env.js is at startup/server/src/config,
// four levels down); override — resolved against the boot CWD when relative —
// for deployments where the compiled gateway artifact lives elsewhere.
let gatewayDir = process.env.GATEWAY_DIR;
if (gatewayDir) {
  gatewayDir = path.isAbsolute(gatewayDir) ? gatewayDir : path.resolve(process.cwd(), gatewayDir);
} else {
  gatewayDir = path.resolve(__dirname, '../../../../biometric_gateway');
}

const PISCINA_MAX_THREADS = process.env.PISCINA_MAX_THREADS === '0' ? 0 : parseInt(process.env.PISCINA_MAX_THREADS, PARSE_INT_RADIX) || Math.max(1, os.cpus().length - 1);
const PISCINA_MIN_THREADS = process.env.PISCINA_MIN_THREADS === '0' ? 0 : parseInt(process.env.PISCINA_MIN_THREADS, PARSE_INT_RADIX) || Math.max(1, Math.floor(os.cpus().length / 2));

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


  TOTP_ISSUER: process.env.TOTP_ISSUER || appName,
  TOTP_WINDOW: parseInt(process.env.TOTP_WINDOW, PARSE_INT_RADIX) || 1,

  // Report runner
  ENABLE_REPORT_RUNNER: String(process.env.ENABLE_REPORT_RUNNER ?? '').trim().toLowerCase() !== 'false',
  REPORT_RUNNER_URL: process.env.REPORT_RUNNER_URL,
  REPORT_RUNNER_PORT: parseInt(process.env.REPORT_RUNNER_PORT, PARSE_INT_RADIX) || 8945,
  REPORT_RUNNER_HOST: process.env.REPORT_RUNNER_HOST || '0.0.0.0',
  // How many saved report runs the runner computes at once. Saved runs finish in
  // the background so they queue; the synchronous path is not bounded by this.
  REPORT_RUNNER_CONCURRENCY: parseInt(process.env.REPORT_RUNNER_CONCURRENCY, PARSE_INT_RADIX) || 2,

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
  // Path to a JSON file holding the HOST's network interfaces + machine-id,
  // for installs where the process cannot see them itself (Docker). Unset on
  // bare-metal installs, where machineFingerprint reads the OS directly.
  HOST_MACHINE_FILE: process.env.HOST_MACHINE_FILE,

  // File upload configuration
  UPLOADS_DIR: uploadsDir,

  // Biometric gateway root (see gatewayDir resolution above)
  GATEWAY_DIR: gatewayDir,

  // Secret directory configuration
  SECRET_DIR: secretDir,

  // EasyWDMS API configuration
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

  // Deepvue KYC (DigiLocker consent flow). DEEPVUE_API_KEY is the client secret
  // and is server-only — it must never reach the browser. With any of the three
  // unset the interface no-ops and the feature reports itself unconfigured
  // rather than failing mid-flow.
  // DEEPVUE_KYC_PURPOSE is sent to DigiLocker verbatim and shown to the employee
  // on the consent screen, so it should describe the real purpose.
  // DEEPVUE_REDIRECT_URL is optional; without it DigiLocker lands on Deepvue's
  // own completion page, which the browser flow handles equally well.
  DEEPVUE_BASE_URL: (process.env.DEEPVUE_BASE_URL || 'https://production.deepvue.tech').trim(),
  DEEPVUE_CLIENT_ID: (process.env.DEEPVUE_CLIENT_ID || '').trim() || null,
  DEEPVUE_API_KEY: (process.env.DEEPVUE_API_KEY || '').trim() || null,
  DEEPVUE_KYC_PURPOSE: (process.env.DEEPVUE_KYC_PURPOSE || 'employee onboarding').trim(),
  DEEPVUE_REDIRECT_URL: (process.env.DEEPVUE_REDIRECT_URL || '').trim() || null,

  // whatsapp-sender app. WHATSAPP_SENDER_URL
  WHATSAPP_SENDER_URL: (process.env.WHATSAPP_SENDER_URL || '').trim() || null,
  WHATSAPP_SENDER_APP_KEY: (process.env.WHATSAPP_SENDER_APP_KEY || '').trim() || null,

  // mailer app.
  MAILER_URL: (process.env.MAILER_URL || '').trim() || null,
  MAILER_EMAIL_SECRET_KEY: (process.env.MAILER_EMAIL_SECRET_KEY || '').trim() || null,

  // OIDC RP / Wallet SSO (ADR 001)
  OIDC_ISSUER: process.env.OIDC_ISSUER,
  // Wallet Application.app_key. One value, two uses: the OIDC client_id on the
  // wire, and the key identifying this app when pushing subscriptions to Wallet.
  APP_KEY: process.env.APP_KEY,
  OIDC_CLIENT_SECRET: process.env.OIDC_CLIENT_SECRET,
  OIDC_REDIRECT_URI: process.env.OIDC_REDIRECT_URI,
  OIDC_SCOPES: process.env.OIDC_SCOPES || 'openid profile offline_access',
  OIDC_POST_LOGOUT_REDIRECT_URI: process.env.OIDC_POST_LOGOUT_REDIRECT_URI,

  // Shared secret guarding the internal service-to-service API
  // (/api/v1/internal). The standalone biometric gateways send it in the
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
  isOnPremDeployment,
  isOidcSecureCookie,
  isDevelopment,



  // local installs
  // Path to the built client bundle; resolved against process.cwd() at use.
  CLIENT_STATIC_DIR: process.env.CLIENT_STATIC_DIR || '../client',



  // CI/tests - Non-interactive create_company script credentials (scripted runs).
  SADMIN_USERNAME: process.env.SADMIN_USERNAME,
  SADMIN_PASSWORD: process.env.SADMIN_PASSWORD

};
