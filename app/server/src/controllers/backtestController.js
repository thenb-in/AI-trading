// Thin controller: no req/res, no models — delegates to the backtest,
// seasonality and candle-store services and exposes small formatting helpers
// the view needs (broker error text, trade-log CSV).
const ytBacktestService = require('../services/ytBacktestService');
const seasonalityService = require('../services/seasonalityService');
const candleStoreService = require('../services/candleStoreService');
const { tradesToCsv } = require('../services/method2BacktestService');
const { getZerodhaErrorMessage } = require('../services/broker');

// ── YT year backtest (their good points × ours) ──────────────────────────
async function runYt(opts) {
  return ytBacktestService.runYtBacktest(opts);
}

async function latestYt(pricing, triggerSet, expiryRule) {
  return ytBacktestService.latestYtReport(pricing, triggerSet, expiryRule);
}

function reportToCsv(row) {
  return tradesToCsv(row.trades);
}

// ── Financial-year seasonality ────────────────────────────────────────────
async function getSeasonality(symbol) {
  return seasonalityService.getSeasonality(symbol);
}

async function getTiltState() {
  return seasonalityService.liveTiltState();
}

async function setTilt(enabled) {
  return seasonalityService.setTiltEnabled(enabled);
}

// ── Candle store (DB) ──────────────────────────────────────────────────────
async function getResampledCandles(symbol, intervalMins, fromUnix, toUnix) {
  return candleStoreService.getResampledIndexCandles(symbol, intervalMins, fromUnix, toUnix);
}

async function getStoreStatus() {
  return candleStoreService.storeStatus();
}

// Broker-aware error text for the HTTP error envelope (not a model).
function formatBrokerError(err) {
  return getZerodhaErrorMessage(err);
}

module.exports = {
  runYt,
  latestYt,
  reportToCsv,
  getSeasonality,
  getTiltState,
  setTilt,
  getResampledCandles,
  getStoreStatus,
  formatBrokerError,
};
