// Thin controller for the market read endpoints: no req/res, no models.
//
// Every handler the market dashboard hits just calls a foundation service, so
// this layer exposes those foundation functions by name and the view holds the
// original request/response body verbatim. The foundation surface is frozen:
//   - broker (Zerodha)        -> ../services/broker
//   - market data + indicators -> ../services/market_data
//   - OI-change read           -> ../services/optionSnapshotService (F4 sibling)
const broker = require('@appServer/interfaces/broker');
const marketData = require('../services/market_data');
const { getOiChangeAnalysis } = require('../services/optionSnapshotService');
const { getSpotSummary } = require('../services/spotSummaryService');

module.exports = {
  // --- market_data (NSE quotes, candles, indicators, session, trade mode) ---
  getNiftyOptions: marketData.getNiftyOptions,
  getNiftyCandles: marketData.getNiftyCandles,
  getBankNiftyCandles: marketData.getBankNiftyCandles,
  getBankNiftyPrice: marketData.getBankNiftyPrice,
  getMarketSnapshot: marketData.getMarketSnapshot,
  invalidateMarketCache: marketData.invalidateMarketCache,
  getNiftyMarketBias: marketData.getNiftyMarketBias,
  getIndiaVix: marketData.getIndiaVix,
  evaluateMarketSession: marketData.evaluateMarketSession,
  calculateSuperTrend: marketData.calculateSuperTrend,
  calculateMacd: marketData.calculateMacd,
  analyzeVolume: marketData.analyzeVolume,
  extractPreviousDayLevels: marketData.extractPreviousDayLevels,
  calculateCpr: marketData.calculateCpr,
  getNiftyChartAnalysis: marketData.getNiftyChartAnalysis,
  getTradeMode: marketData.getTradeMode,
  setTradeMode: marketData.setTradeMode,

  // --- broker (option analytics + historical candles + error helper) ---
  calculateMaxPain: broker.calculateMaxPain,
  getOiBasedSupportResistance: broker.getOiBasedSupportResistance,
  fetchHistoricalCandles: broker.fetchHistoricalCandles,
  getZerodhaErrorMessage: broker.getZerodhaErrorMessage,

  // --- option snapshot (OI change) ---
  getOiChangeAnalysis,

  // --- spot summary (header clock strip) ---
  getSpotSummary
};
