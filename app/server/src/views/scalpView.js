// View layer: owns req/res. Request parsing (symbol/days/slippage/id) and the
// HTTP response shapes are preserved EXACTLY as the legacy index.js handlers —
// raw JSON bodies and the same error codes/messages the client depends on.
const logger = require('@startup/logger');
const { getZerodhaErrorMessage } = require('../services/broker');
const scalpController = require('../controllers/scalpController');

// GET /market/scalp — live regime read + order card
async function getLiveScalpView(req, res) {
  try {
    const symbol = req.query.symbol === 'BANKNIFTY' ? 'BANKNIFTY' : 'NIFTY';
    const result = await scalpController.getLiveScalp(symbol);
    res.json(result);
  } catch (err) {
    res.status(502).json({ error: 'Scalp evaluation failed', message: getZerodhaErrorMessage(err) });
  }
}

// GET /market/scalp/backtest — measured win rate vs the breakeven it needs
async function getBacktestView(req, res) {
  try {
    const symbol = req.query.symbol === 'BANKNIFTY' ? 'BANKNIFTY' : 'NIFTY';
    const days   = Math.min(Math.max(parseInt(req.query.days, 10) || 90, 5), 180);
    const slippagePts = req.query.slippage != null ? Number(req.query.slippage) : undefined;
    logger.info(`[scalp-backtest] ${symbol}, ${days} days, slippage ${slippagePts ?? 'default'}…`);
    const result = await scalpController.runBacktest(symbol, days, slippagePts);
    res.json(result);
  } catch (err) {
    res.status(502).json({ error: 'Scalp backtest failed', message: getZerodhaErrorMessage(err) });
  }
}

// GET /market/scalp/breakeven
function getBreakevenView(_req, res) {
  res.json(scalpController.getBreakeven());
}

// GET /market/scalp/paper — forward paper-trading scorecard
async function getPaperStatsView(_req, res) {
  try {
    res.json(await scalpController.getPaperStats());
  } catch (err) {
    res.status(502).json({ error: 'Paper stats failed', message: err instanceof Error ? err.message : 'Unknown error' });
  }
}

// POST /market/scalp/paper/tick — run one recorder tick immediately
async function runPaperTickView(_req, res) {
  try {
    res.json(await scalpController.runPaperTick());
  } catch (err) {
    res.status(502).json({ error: 'Paper tick failed', message: getZerodhaErrorMessage(err) });
  }
}

// POST /market/scalp/report/run — runs +1..+4 vs -5 on both engines, saves all
async function runShapeReportView(_req, res) {
  try {
    logger.info('[scalpReport] running shape report…');
    res.json(await scalpController.runShapeReport());
  } catch (err) {
    res.status(502).json({ error: 'Shape report failed', message: getZerodhaErrorMessage(err) });
  }
}

// POST /market/scalp/report/matrix — strategy × lots matrix
async function runMatrixReportView(_req, res) {
  try {
    logger.info('[scalpReport] running strategy x lots matrix…');
    res.json(await scalpController.runMatrixReport());
  } catch (err) {
    res.status(502).json({ error: 'Matrix report failed', message: getZerodhaErrorMessage(err) });
  }
}

// GET /market/scalp/config — live engine configuration
function getConfigView(_req, res) {
  res.json(scalpController.getConfig());
}

// GET /market/scalp/report — latest saved reports
async function listReportsView(_req, res) {
  try { res.json(await scalpController.listReports()); }
  catch (err) { res.status(500).json({ error: 'Report list failed', message: getZerodhaErrorMessage(err) }); }
}

// GET /market/scalp/report/:id — one full report incl. trade log
async function getReportView(req, res) {
  try {
    const row = await scalpController.getReport(Number(req.params.id));
    if (!row) return res.status(404).json({ error: 'No such report' });
    res.json(row);
  } catch (err) { res.status(500).json({ error: 'Report fetch failed', message: getZerodhaErrorMessage(err) }); }
}

module.exports = {
  getLiveScalpView,
  getBacktestView,
  getBreakevenView,
  getPaperStatsView,
  runPaperTickView,
  runShapeReportView,
  runMatrixReportView,
  getConfigView,
  listReportsView,
  getReportView,
};
