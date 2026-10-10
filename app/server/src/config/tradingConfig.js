'use strict';

// Safe, synchronous accessor for the company-level strategy tunables.
//
// Their HOME is now the CompanyProfile row (see MIGRATION.md "Strategy
// tunables → Company Profile"); this module is the read side the strategy
// services call instead of touching process.env. It caches the sole company's
// trading config and hands it back as clean, typed keys.
//
// Hard guarantees (the scheduler and module-load paths call this before the DB
// or company data may exist):
//   - getTunables() is SYNCHRONOUS, NEVER throws, and NEVER blocks.
//   - With no cache yet it kicks a background load and returns DEFAULTS.
//   - If the DB / company / profile is absent or a load fails, it returns the
//     last good cache, or DEFAULTS. It never surfaces an error to the caller.
//
// Company resolution (single-tenant): the sole company is resolved through the
// framework companyService (getAllCompanies, first row) — no request context
// needed and no model is imported here. Its profile is then read through
// companyProfileTradingService (the one owner of the CompanyProfile model).
const logger = require('@startup/logger');
const companyService = require('@startup/src/services/companyService');
const companyProfileTradingService = require('../services/companyProfileTradingService');

// DEFAULTS mirror the legacy env.js tunable fallbacks byte-for-byte, and equal
// the CompanyProfile column defaults FND-D seeded, so behaviour is identical
// whether we serve cache or defaults.
const DEFAULTS = Object.freeze({
  macdFast: 12,
  macdSlow: 26,
  macdSignal: 9,
  supertrendAtrPeriod: 10,
  supertrendMultiplier: 3,
  vixHigh: 20,
  vixLow: 11,
  volumeBreakoutMultiplier: 1.5,
  cprNarrowThresholdPct: 0.003,
  signalUsePcrWeighting: true,
  signalTradeMode: 'selective',
  // confidence weights (points into the 8-factor score)
  macdWeight: 8,
  vixWeight: 10,
  volumeWeight: 5,
  supertrendWeight: 10,
  oiChangeWeight: 8,
  oiSrWeight: 7,
  maxPainWeight: 5,
  pdhPdlWeight: 7,
  cprWeight: 5,
  // IST market session window
  session: Object.freeze({
    marketOpenTime: '09:15',
    marketCloseTime: '15:30',
    blockOpening: true,
    blockLunch: true,
    blockClosing: true,
    expiryDaySpecial: true
  }),
  tradingSymbols: Object.freeze(['NIFTY', 'BANKNIFTY', 'SENSEX'])
});

const TTL_MS = 60_000;

let cache = null; // last good clean tunables; null = never successfully loaded
let lastAttemptAt = 0; // when the last refresh attempt finished
let loading = false; // one in-flight refresh at a time

const num = (value, fallback) => (value === null || value === undefined ? fallback : Number(value));
const bool = (value, fallback) => (value === null || value === undefined ? fallback : Boolean(value));

// Map the CompanyProfile snake_case trading slice onto clean typed keys,
// falling back to DEFAULTS for any field that is absent. Parsing semantics are
// preserved: signal_trade_mode is 'medium' only when exactly 'medium' (else
// 'selective'); signal_use_pcr_weighting is a stored boolean (default true).
function toTunables(cfg) {
  if (!cfg) {
    return DEFAULTS;
  }
  return {
    macdFast: num(cfg.macd_fast, DEFAULTS.macdFast),
    macdSlow: num(cfg.macd_slow, DEFAULTS.macdSlow),
    macdSignal: num(cfg.macd_signal, DEFAULTS.macdSignal),
    supertrendAtrPeriod: num(cfg.supertrend_atr_period, DEFAULTS.supertrendAtrPeriod),
    supertrendMultiplier: num(cfg.supertrend_multiplier, DEFAULTS.supertrendMultiplier),
    vixHigh: num(cfg.vix_high_threshold, DEFAULTS.vixHigh),
    vixLow: num(cfg.vix_low_threshold, DEFAULTS.vixLow),
    volumeBreakoutMultiplier: num(cfg.volume_breakout_multiplier, DEFAULTS.volumeBreakoutMultiplier),
    cprNarrowThresholdPct: num(cfg.cpr_narrow_threshold_pct, DEFAULTS.cprNarrowThresholdPct),
    signalUsePcrWeighting: bool(cfg.signal_use_pcr_weighting, DEFAULTS.signalUsePcrWeighting),
    signalTradeMode: cfg.signal_trade_mode === 'medium' ? 'medium' : 'selective',
    macdWeight: num(cfg.macd_confidence_weight, DEFAULTS.macdWeight),
    vixWeight: num(cfg.vix_confidence_weight, DEFAULTS.vixWeight),
    volumeWeight: num(cfg.volume_confidence_weight, DEFAULTS.volumeWeight),
    supertrendWeight: num(cfg.supertrend_confidence_weight, DEFAULTS.supertrendWeight),
    oiChangeWeight: num(cfg.oi_change_confidence_weight, DEFAULTS.oiChangeWeight),
    oiSrWeight: num(cfg.oi_sr_confidence_weight, DEFAULTS.oiSrWeight),
    maxPainWeight: num(cfg.max_pain_confidence_weight, DEFAULTS.maxPainWeight),
    pdhPdlWeight: num(cfg.pdh_pdl_confidence_weight, DEFAULTS.pdhPdlWeight),
    cprWeight: num(cfg.cpr_confidence_weight, DEFAULTS.cprWeight),
    session: {
      marketOpenTime: cfg.market_open_time || DEFAULTS.session.marketOpenTime,
      marketCloseTime: cfg.market_close_time || DEFAULTS.session.marketCloseTime,
      blockOpening: bool(cfg.session_block_opening, DEFAULTS.session.blockOpening),
      blockLunch: bool(cfg.session_block_lunch, DEFAULTS.session.blockLunch),
      blockClosing: bool(cfg.session_block_closing, DEFAULTS.session.blockClosing),
      expiryDaySpecial: bool(cfg.session_expiry_day_special, DEFAULTS.session.expiryDaySpecial)
    },
    tradingSymbols: Array.isArray(cfg.trading_symbols) && cfg.trading_symbols.length
      ? cfg.trading_symbols
      : DEFAULTS.tradingSymbols
  };
}

// Resolve the sole company id without a request context. Single-tenant: the
// first (only) company. Returns null when no company exists yet.
async function resolveCompanyId() {
  const companies = await companyService.getAllCompanies();
  return companies && companies.length ? companies[0].id : null;
}

// Reload the cache from the company profile. Awaitable, but callers never have
// to await it. Swallows every error and keeps the last good cache (or DEFAULTS).
async function refreshTradingConfig() {
  if (loading) {
    return cache || DEFAULTS;
  }
  loading = true;
  try {
    const companyId = await resolveCompanyId();
    if (companyId) {
      const cfg = await companyProfileTradingService.getTradingConfig(companyId);
      cache = toTunables(cfg);
    }
    return cache || DEFAULTS;
  } catch (err) {
    logger.warn(`[tradingConfig] refresh failed, serving ${cache ? 'cached' : 'default'} tunables: ${err instanceof Error ? err.message : err}`);
    return cache || DEFAULTS;
  } finally {
    lastAttemptAt = Date.now();
    loading = false;
  }
}

// Synchronous, non-blocking, never-throwing. Returns cache when fresh; kicks a
// background refresh when cold or stale and returns the best value we have now.
function getTunables() {
  if (!cache || Date.now() - lastAttemptAt > TTL_MS) {
    refreshTradingConfig().catch(() => {});
  }
  return cache || DEFAULTS;
}

// Periodic refresh so a profile edit lands without waiting for the next read.
// unref() so the timer never keeps the process alive.
const refreshTimer = setInterval(() => {
  refreshTradingConfig().catch(() => {});
}, TTL_MS);
if (refreshTimer.unref) {
  refreshTimer.unref();
}

module.exports = { getTunables, refreshTradingConfig, DEFAULTS };
