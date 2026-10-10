// Thin controller: no req/res, no models — composes the scalp services.
// The live-scalp orchestration (fetch candles → evaluate against the real
// option chain) lived inline in the legacy index.js route handler; it moves
// here unchanged, delegating the data fetch to the broker service and the
// strike resolution to the paper recorder, exactly as the source did.
const scalpService = require('../services/scalpService');
const scalpPaperService = require('../services/scalpPaperService');
const scalpReportService = require('../services/scalpReportService');
const { fetchHistoricalCandles, getOptionQuotesByTradingSymbols } = require('@appServer/interfaces/broker');

async function getLiveScalp(symbol) {
  const to = Math.floor(Date.now() / 1000);
  // 3 hours of 1-minute bars is plenty for a 20-candle window
  const candles = await fetchHistoricalCandles(symbol, to - 3 * 3600, to, 'minute');
  const result = await scalpService.evaluateScalp(candles, {
    now: to,
    // The premium cap is a live-money constraint — price it off the real
    // chain, using contracts that actually exist (nfo_instruments), not
    // symbols fabricated from an assumed expiry weekday.
    quoteFn: getOptionQuotesByTradingSymbols,
    strikeCandidatesFn: (optType, spot) => scalpPaperService.liveStrikeCandidates(optType, spot, symbol),
  });
  return { symbol, ...result, candlesUsed: candles.length };
}

async function runBacktest(symbol, days, slippagePts) {
  return scalpService.runScalpBacktest(symbol, { days, slippagePts });
}

// What win rate the fixed +2/-5 shape has to beat, across slippage levels.
function getBreakeven() {
  return {
    note: 'Risking 5 points to make 2 needs 71.4% before costs. These are the real bars.',
    levels: [0, 0.1, 0.25, 0.5, 1].map(slip => ({ slippagePts: slip, ...scalpService.breakevenWinRate(slip) })),
  };
}

async function getPaperStats() {
  return scalpPaperService.getPaperStats();
}

async function runPaperTick() {
  return scalpPaperService.tick('NIFTY');
}

async function runShapeReport() {
  return scalpReportService.runShapeReport();
}

async function runMatrixReport() {
  return scalpReportService.runMatrixReport();
}

// What the engine is configured to do RIGHT NOW — served from the live
// constants, so the logic page can never drift from the code.
function getConfig() {
  const { RECORD_CFG } = scalpPaperService;
  return {
    regimeBase: scalpService.REGIME,
    regimeStrict: scalpService.REGIME_STRICT,
    trade: {
      lots: 2, qty: scalpService.QTY,
      targetPts: RECORD_CFG.targetPts, stopPts: RECORD_CFG.stopPts,
      maxEntryPremium: scalpService.MAX_ENTRY_PREMIUM,
      holdRule: 'until target or stop; force-close 15:20 IST; no overnight carry',
      circuitBreaker: `${scalpService.MAX_CONSECUTIVE_STOPS} consecutive stops halts the day`,
    },
    oiFlow: {
      windowMin: RECORD_CFG.flowWindowMin,
      rule: 'BUY only if put OI is building at/below spot and outweighs call build above; SELL mirrored',
    },
    frictionPerTrade: {
      chargesApprox: scalpService.estimateCosts(225, 228),
      slippageAssumedPts: 0.25,
      note: 'brokerage Rs.20x2 flat + STT + exchange txn + GST + stamp; slippage 0.25 pts per side',
    },
  };
}

async function listReports() {
  return scalpReportService.listReports();
}

async function getReport(id) {
  return scalpReportService.getReport(id);
}

module.exports = {
  getLiveScalp,
  runBacktest,
  getBreakeven,
  getPaperStats,
  runPaperTick,
  runShapeReport,
  runMatrixReport,
  getConfig,
  listReports,
  getReport,
};
