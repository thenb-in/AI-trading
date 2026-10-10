// Centralized app environment configuration.
//
// Re-exports the framework env surface and layers every AI-Trading-specific
// key on top. Services read from here instead of touching process.env — no
// direct dotenv (lint-banned); the framework env module loads dotenv-safe once.
//
// Secrets and URLs only. The strategy tunables (MACD/SuperTrend/VIX/volume/
// trade-mode/confidence-weights/CPR) moved to their home on the CompanyProfile
// row and are read through src/config/tradingConfig.js — not from env anymore.
// The Zerodha broker credentials (api key, api secret, access token) likewise
// moved to the CompanyProfile row and are read through
// src/config/brokerCredentials.js — not from env anymore.
const frameworkEnv = require('@startup/src/config/env');

module.exports = {
  ...frameworkEnv,

  // --- Mailer ---
  MAILER_URL: process.env.MAILER_URL,
  MAILER_SECRET_KEY: process.env.MAILER_SECRET_KEY || '',
  SIGNAL_EMAIL_TO: process.env.SIGNAL_EMAIL_TO || '',

  // --- URLs ---
  FRONTEND_URL: process.env.FRONTEND_URL,
};
