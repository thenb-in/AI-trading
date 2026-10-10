// Centralized app environment configuration.
//
// Re-exports the framework env surface and layers every AI-Trading-specific
// key on top. Services read from here instead of touching process.env — no
// direct dotenv (lint-banned); the framework env module loads dotenv-safe once.
//
// NOTE (deferred): the strategy tunables below are read straight from
// process.env today, matching the legacy source exactly. Their eventual home
// is Company Profile (see MIGRATION.md). Defaults here mirror the source
// `|| <default>` fallbacks byte-for-byte so behaviour is unchanged.
const frameworkEnv = require('@startup/src/config/env');

module.exports = {
  ...frameworkEnv,

  // --- Broker (Zerodha) secrets ---
  ZERODHA_API_KEY: process.env.ZERODHA_API_KEY,
  ZERODHA_API_SECRET: process.env.ZERODHA_API_SECRET,
  ZERODHA_ACCESS_TOKEN: process.env.ZERODHA_ACCESS_TOKEN,

  // --- Mailer ---
  MAILER_URL: process.env.MAILER_URL,
  MAILER_SECRET_KEY: process.env.MAILER_SECRET_KEY || '',
  SIGNAL_EMAIL_TO: process.env.SIGNAL_EMAIL_TO || '',

  // --- URLs ---
  FRONTEND_URL: process.env.FRONTEND_URL,

  // --- Strategy tunables (indicators) ---
  MACD_FAST: Number(process.env.MACD_FAST) || 12,
  MACD_SLOW: Number(process.env.MACD_SLOW) || 26,
  MACD_SIGNAL: Number(process.env.MACD_SIGNAL) || 9,
  SUPERTREND_ATR_PERIOD: Number(process.env.SUPERTREND_ATR_PERIOD) || 10,
  SUPERTREND_MULTIPLIER: Number(process.env.SUPERTREND_MULTIPLIER) || 3,
  VIX_HIGH_THRESHOLD: Number(process.env.VIX_HIGH_THRESHOLD) || 20,
  VIX_LOW_THRESHOLD: Number(process.env.VIX_LOW_THRESHOLD) || 11,
  VOLUME_BREAKOUT_MULTIPLIER: Number(process.env.VOLUME_BREAKOUT_MULTIPLIER) || 1.5,

  // --- Trade mode / signal weighting ---
  TRADE_MODE: process.env.TRADE_MODE,
  SIGNAL_USE_PCR_WEIGHTING: process.env.SIGNAL_USE_PCR_WEIGHTING,
  CPR_NARROW_THRESHOLD_PCT: Number(process.env.CPR_NARROW_THRESHOLD_PCT) || 0.003,

  // --- Confidence weights (8-factor signal engine) ---
  MACD_CONFIDENCE_WEIGHT: Number(process.env.MACD_CONFIDENCE_WEIGHT) || 8,
  VIX_CONFIDENCE_WEIGHT: Number(process.env.VIX_CONFIDENCE_WEIGHT) || 10,
  VOLUME_CONFIDENCE_WEIGHT: Number(process.env.VOLUME_CONFIDENCE_WEIGHT) || 5,
  SUPERTREND_CONFIDENCE_WEIGHT: Number(process.env.SUPERTREND_CONFIDENCE_WEIGHT) || 10,
  OI_CHANGE_CONFIDENCE_WEIGHT: Number(process.env.OI_CHANGE_CONFIDENCE_WEIGHT) || 8,
  OI_SR_CONFIDENCE_WEIGHT: Number(process.env.OI_SR_CONFIDENCE_WEIGHT) || 7,
  MAX_PAIN_CONFIDENCE_WEIGHT: Number(process.env.MAX_PAIN_CONFIDENCE_WEIGHT) || 5,
  PDH_PDL_CONFIDENCE_WEIGHT: Number(process.env.PDH_PDL_CONFIDENCE_WEIGHT) || 7,
  CPR_CONFIDENCE_WEIGHT: Number(process.env.CPR_CONFIDENCE_WEIGHT) || 5,
};
