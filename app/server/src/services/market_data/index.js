'use strict';

/**
 * Market-data read/cache layer: NSE quotes, Zerodha-backed candles, the full
 * indicator suite (SuperTrend / MACD / ADX / volume / EMA / RSI / VWAP / CPR /
 * PDH-PDL), market-bias + regime, India VIX, the rule-based signal engine,
 * trade-mode switch, NSE debug probes, the 10s market snapshot cache, session
 * helpers, and Method 1's live swing-S/R breakout read.
 *
 * Re-exports the exact public surface of each module so callers can depend on a
 * single `market_data` entry point without knowing the internal file split.
 */

const nseService = require('./nseService');
const marketCache = require('./marketCache');
const marketHelpers = require('./marketHelpers');
const m1Signal = require('./m1Signal');

module.exports = {
  ...nseService,
  ...marketCache,
  ...marketHelpers,
  ...m1Signal,
};
