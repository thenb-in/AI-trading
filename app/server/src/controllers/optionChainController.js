'use strict';

// Thin controller for the option-chain / OI endpoints: no req/res, no models —
// it only delegates to services and shapes the plain objects the view returns.
//
// tickerService (F6) and chainBenchmarkService (F2) are required lazily inside
// the handlers so this module loads even while those sibling waves land, and to
// mirror the source's inline-require pattern for those paths.
const optionSnapshotService = require('../services/optionSnapshotService');
const chainFeedService = require('../services/chainFeedService');
const appSettingService = require('../services/appSettingService');
const spreadSampleService = require('../services/spreadSampleService');

// Starred strikes, persisted per index as ["NIFTY:23000", ...].
const BOOKMARK_KEY = 'chain_bookmarks';

async function getRecentSnapshots(filters) {
  return optionSnapshotService.getRecentSnapshots(filters);
}

function getLiveChain(symbol) {
  const tickerService = require('../services/tickerService');
  return tickerService.getChain(symbol);
}

async function getBookmarks() {
  const value = await appSettingService.getValue(BOOKMARK_KEY);
  return { bookmarks: Array.isArray(value) ? value : [] };
}

async function saveBookmarks(list) {
  await appSettingService.setValue(BOOKMARK_KEY, list);
  return { ok: true, bookmarks: list };
}

async function getSpreadSummary({ symbol, premMin, premMax }) {
  const r = await spreadSampleService.getSpreadSummary({ symbol, premMin, premMax });
  return {
    symbol, premiumBand: [premMin, premMax], ...r,
    impliedSlippagePerSide: r.median_spread != null ? Number((r.median_spread / 2).toFixed(3)) : null,
    assumptionInBacktests: 0.25,
    note: 'slippage per side ≈ half the spread (crossing from mid); backtests assume 0.25'
  };
}

async function runChainBenchmark() {
  const { runChainBenchmark: run } = require('../services/chainBenchmarkService');
  return run();
}

function getFeedStatus() {
  return chainFeedService.feedStatus();
}

module.exports = {
  getRecentSnapshots,
  getLiveChain,
  getBookmarks,
  saveBookmarks,
  getSpreadSummary,
  runChainBenchmark,
  getFeedStatus
};
