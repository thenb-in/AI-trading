// View layer for the market read endpoints: owns req/res only.
//
// Each handler body is the faithful move of the inline route handler that
// lived in the legacy server/index.js. The business payload is preserved
// exactly; it is wrapped in the framework { success, data } envelope at the
// response boundary (success: { success:true, data:<payload> }; failure:
// { success:false, error, message } with the original status codes).
const controller = require('../controllers/marketController');

async function getNiftyOptionsView(_req, res) {
  try { res.json({ success: true, data: await controller.getNiftyOptions() }); }
  catch (err) { res.status(502).json({ success: false, error: 'Options fetch failed', message: err instanceof Error ? err.message : 'Unknown error' }); }
}

async function getNiftyCandlesView(_req, res) {
  try { res.json({ success: true, data: await controller.getNiftyCandles() }); }
  catch (err) { res.status(502).json({ success: false, error: 'Candle fetch failed', message: err instanceof Error ? err.message : 'Unknown error' }); }
}

async function getNiftyIndicatorsView(_req, res) {
  try {
    const snapshot = await controller.getMarketSnapshot();
    if (!snapshot.indicators) throw new Error('Indicators not available');
    res.json({ success: true, data: snapshot.indicators });
  } catch (err) { res.status(502).json({ success: false, error: 'Indicators fetch failed', message: err instanceof Error ? err.message : 'Unknown error' }); }
}

async function getBankNiftyIndicatorsView(_req, res) {
  try {
    const data = await controller.getBankNiftyCandles();
    res.json({ success: true, data: { latestClosePrice: data.latestClosePrice, ema20: data.ema20, ema50: data.ema50, vwap: data.vwap, rsi: data.rsi, rsiInterpretation: data.rsiInterpretation } });
  } catch (err) { res.status(502).json({ success: false, error: 'Indicators fetch failed', message: err instanceof Error ? err.message : 'Unknown error' }); }
}

async function getNiftyBiasView(_req, res) {
  try { res.json({ success: true, data: await controller.getNiftyMarketBias() }); }
  catch (err) { res.status(502).json({ success: false, error: 'Market bias fetch failed', message: err instanceof Error ? err.message : 'Unknown error' }); }
}

async function getNiftyPcrView(_req, res) {
  try {
    const snapshot = await controller.getMarketSnapshot();
    if (!snapshot.pcr) throw new Error('PCR not available');
    res.json({ success: true, data: snapshot.pcr });
  } catch (err) { res.status(502).json({ success: false, error: 'PCR fetch failed', message: err instanceof Error ? err.message : 'Unknown error' }); }
}

async function getNiftySignalView(_req, res) {
  try {
    const snapshot = await controller.getMarketSnapshot();
    if (!snapshot.signal) throw new Error('Trade signal not available');
    res.json({ success: true, data: snapshot.signal });
  } catch (err) { res.status(502).json({ success: false, error: 'Trade signal failed', message: err instanceof Error ? err.message : 'Unknown error' }); }
}

async function getNiftyView(_req, res) {
  try {
    const snapshot = await controller.getMarketSnapshot();
    if (!snapshot.niftyPrice) throw new Error('NIFTY price not available');
    res.json({ success: true, data: snapshot.niftyPrice });
  } catch (err) { res.status(502).json({ success: false, error: 'NSE fetch failed', message: err instanceof Error ? err.message : 'Unknown error' }); }
}

async function getBankNiftyView(_req, res) {
  try { res.json({ success: true, data: await controller.getBankNiftyPrice() }); }
  catch (err) { res.status(502).json({ success: false, error: 'NSE fetch failed', message: err instanceof Error ? err.message : 'Unknown error' }); }
}

async function getVixView(_req, res) {
  try { res.json({ success: true, data: await controller.getIndiaVix() }); }
  catch (err) { res.status(502).json({ success: false, error: 'VIX fetch failed', message: err instanceof Error ? err.message : 'Unknown error' }); }
}

function getSessionView(_req, res) {
  res.json({ success: true, data: controller.evaluateMarketSession() });
}

async function getNiftySuperTrendView(_req, res) {
  try { const c = await controller.getNiftyCandles(); res.json({ success: true, data: controller.calculateSuperTrend(c.candles) }); }
  catch (err) { res.status(502).json({ success: false, error: 'SuperTrend failed', message: err instanceof Error ? err.message : 'Unknown error' }); }
}

async function getNiftyMacdView(_req, res) {
  try { const c = await controller.getNiftyCandles(); res.json({ success: true, data: controller.calculateMacd(c.candles) }); }
  catch (err) { res.status(502).json({ success: false, error: 'MACD failed', message: err instanceof Error ? err.message : 'Unknown error' }); }
}

async function getNiftyVolumeView(_req, res) {
  try { const c = await controller.getNiftyCandles(); res.json({ success: true, data: controller.analyzeVolume(c.candles) }); }
  catch (err) { res.status(502).json({ success: false, error: 'Volume analysis failed', message: err instanceof Error ? err.message : 'Unknown error' }); }
}

async function getNiftyOiChangeView(_req, res) {
  try { res.json({ success: true, data: await controller.getOiChangeAnalysis() }); }
  catch (err) { res.status(502).json({ success: false, error: 'OI change analysis failed', message: err instanceof Error ? err.message : 'Unknown error' }); }
}

async function getNiftyMaxPainView(_req, res) {
  try { res.json({ success: true, data: await controller.calculateMaxPain() }); }
  catch (err) { res.status(502).json({ success: false, error: 'Max pain failed', message: err instanceof Error ? err.message : 'Unknown error' }); }
}

async function getNiftyCprView(_req, res) {
  try {
    const candles = await controller.getNiftyCandles();
    const levels = controller.extractPreviousDayLevels(candles.candles);
    if (levels.pdh == null || levels.pdl == null || levels.pdc == null) {
      res.json({ success: true, data: { error: 'Previous day levels not available', levels } }); return;
    }
    const price = candles.latestClosePrice ?? 0;
    const cpr = controller.calculateCpr(levels.pdh, levels.pdl, levels.pdc, price, 'BUY');
    res.json({ success: true, data: { ...cpr, pdh: levels.pdh, pdl: levels.pdl, pdc: levels.pdc } });
  } catch (err) { res.status(502).json({ success: false, error: 'CPR failed', message: err instanceof Error ? err.message : 'Unknown error' }); }
}

async function getNiftyOiSrView(_req, res) {
  try { res.json({ success: true, data: await controller.getOiBasedSupportResistance() }); }
  catch (err) { res.status(502).json({ success: false, error: 'OI S/R failed', message: err instanceof Error ? err.message : 'Unknown error' }); }
}

async function getCandlesView(req, res) {
  try {
    const symbol = req.query.symbol === 'BANKNIFTY' ? 'BANKNIFTY' : 'NIFTY';
    const from = parseInt(String(req.query.from ?? ''), 10);
    const to = parseInt(String(req.query.to ?? ''), 10);
    if (isNaN(from) || isNaN(to) || from >= to) {
      res.status(400).json({ success: false, error: 'Invalid params' }); return;
    }
    const MAX_RANGE = 60 * 24 * 60 * 60;
    const clampedFrom = Math.max(from, to - MAX_RANGE);
    const candles = await controller.fetchHistoricalCandles(symbol, clampedFrom, to);
    res.json({ success: true, data: { candles, symbol, from: clampedFrom, to } });
  } catch (err) { res.status(502).json({ success: false, error: 'Historical candle fetch failed', message: err instanceof Error ? err.message : 'Unknown error' }); }
}

async function getChartAnalysisView(req, res) {
  try {
    const symbol = req.query.symbol === 'BANKNIFTY' ? 'BANKNIFTY' : 'NIFTY';
    res.json({ success: true, data: await controller.getNiftyChartAnalysis(symbol) });
  } catch (err) { res.status(502).json({ success: false, error: 'Chart analysis failed', message: err instanceof Error ? err.message : 'Unknown error' }); }
}

async function getSpotSummaryView(_req, res) {
  try { res.json({ success: true, data: await controller.getSpotSummary() }); }
  catch (err) { res.status(500).json({ success: false, error: 'Spot summary failed', message: controller.getZerodhaErrorMessage(err) }); }
}

function getTradeModeView(_req, res) {
  res.json({ success: true, data: { mode: controller.getTradeMode() } });
}

function setTradeModeView(req, res) {
  const { mode } = req.body;
  if (mode !== 'selective' && mode !== 'medium') {
    res.status(400).json({ success: false, error: 'Invalid mode', message: 'mode must be "selective" or "medium"' }); return;
  }
  controller.setTradeMode(mode);
  controller.invalidateMarketCache();
  res.json({ success: true, data: { mode: controller.getTradeMode() } });
}

module.exports = {
  getNiftyOptionsView,
  getNiftyCandlesView,
  getNiftyIndicatorsView,
  getBankNiftyIndicatorsView,
  getNiftyBiasView,
  getNiftyPcrView,
  getNiftySignalView,
  getNiftyView,
  getBankNiftyView,
  getVixView,
  getSessionView,
  getNiftySuperTrendView,
  getNiftyMacdView,
  getNiftyVolumeView,
  getNiftyOiChangeView,
  getNiftyMaxPainView,
  getNiftyCprView,
  getNiftyOiSrView,
  getCandlesView,
  getChartAnalysisView,
  getSpotSummaryView,
  getTradeModeView,
  setTradeModeView,
};
