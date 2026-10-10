// View layer: owns req/res. The business payload is preserved verbatim from the
// legacy inline handlers (index.js: /market/yt/backtest/year[/csv],
// /market/seasonality[/tilt], /market/candles/resampled, /market/candles/status)
// and wrapped in the framework { success, data } envelope at the response
// boundary (failures become { success:false, error, message }). The CSV
// download (ytReportCsvView) stays raw text/csv.
const logger = require('@startup/logger');
const backtestController = require('../controllers/backtestController');

const ARCHIVE_SYMBOLS = ['NIFTY', 'BANKNIFTY', 'SENSEX'];

// ── YT backtest — their good points (29 YouTube videos) × our good points ──
// pricing=project reproduces the Method 2/3 premium model; pricing=calibrated
// applies the IV multipliers measured on the real chain (expiry-day honest).
async function runYtBacktestView(req, res) {
  try {
    const { from, to, pricing, triggerSet, expiryRule } = req.body ?? {};
    logger.info(`[ytyear] running YT year backtest (${pricing || 'project'}, ${triggerSet || 'yt'}, expiryRule=${!!expiryRule})…`);
    const r = await backtestController.runYt({
      from: from || undefined, to: to || undefined,
      pricing: pricing === 'calibrated' ? 'calibrated' : 'project',
      triggerSet: triggerSet === 'all' ? 'all' : 'yt',
      expiryRule: expiryRule === true || expiryRule === 'true',
    });
    res.json({ success: true, data: { id: r.id, label: r.label, params: r.params, summary: r.summary } });
  } catch (err) {
    res.status(502).json({ success: false, error: 'YT backtest failed', message: backtestController.formatBrokerError(err) });
  }
}

async function latestYtReportView(req, res) {
  try {
    const row = await backtestController.latestYt(
      req.query.pricing === 'calibrated' ? 'calibrated' : 'project',
      req.query.triggerSet === 'all' ? 'all' : 'yt',
      req.query.expiryRule === 'true',
    );
    if (!row) return res.status(404).json({ success: false, error: 'No YT backtest yet — run it first' });
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Fetch failed', message: err.message });
  }
}

async function ytReportCsvView(req, res) {
  try {
    const row = await backtestController.latestYt(
      req.query.pricing === 'calibrated' ? 'calibrated' : 'project',
      req.query.triggerSet === 'all' ? 'all' : 'yt',
      req.query.expiryRule === 'true',
    );
    if (!row) return res.status(404).send('No YT backtest yet');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="yt_backtest_${row.params?.from}_${row.params?.to}.csv"`);
    res.send(backtestController.reportToCsv(row));
  } catch (err) { res.status(500).send('CSV failed: ' + err.message); }
}

// ── Financial-year seasonality — repeating calendar patterns ──────────
// Computed from daily bars (collapsed in SQL from the 1-min store,
// 2015 → today after backfill); cached in memory for an hour.
async function seasonalityView(req, res) {
  try {
    const symbol = ['NIFTY', 'BANKNIFTY'].includes(req.query.symbol) ? req.query.symbol : 'NIFTY';
    res.json({ success: true, data: await backtestController.getSeasonality(symbol) });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Seasonality failed', message: backtestController.formatBrokerError(err) });
  }
}

// Seasonal tilt switch: when on, qualifying months nudge live Method 2's
// score by ±2 points (~1% conviction). Persisted; OFF by default.
async function tiltStateView(_req, res) {
  try { res.json({ success: true, data: await backtestController.getTiltState() }); }
  catch (err) { res.status(500).json({ success: false, error: 'Tilt state failed', message: err.message }); }
}

async function setTiltView(req, res) {
  try { res.json({ success: true, data: await backtestController.setTilt(req.body?.enabled === true) }); }
  catch (err) { res.status(500).json({ success: false, error: 'Tilt save failed', message: err.message }); }
}

// ── Candle store (DB) ──────────────────────────────────────────────────────
// GET /market/candles/resampled ?symbol=&interval=&from=&to= — any minute
// interval (1,2,3,4,5,10,15,...) resampled from the DB's 1-min ground truth.
async function resampledCandlesView(req, res) {
  try {
    const symbol = ARCHIVE_SYMBOLS.includes(req.query.symbol) ? req.query.symbol : 'NIFTY';
    const interval = Math.min(Math.max(parseInt(req.query.interval, 10) || 1, 1), 375);
    const to   = req.query.to   ? Math.floor(new Date(`${req.query.to}T23:59:59+05:30`).getTime() / 1000)
                                : Math.floor(Date.now() / 1000);
    const from = req.query.from ? Math.floor(new Date(`${req.query.from}T00:00:00+05:30`).getTime() / 1000)
                                : to - 7 * 86400;
    const candles = await backtestController.getResampledCandles(symbol, interval, from, to);
    res.json({ success: true, data: { symbol, interval, from, to, count: candles.length, candles } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Candle fetch failed', message: backtestController.formatBrokerError(err) });
  }
}

async function candleStatusView(_req, res) {
  try { res.json({ success: true, data: await backtestController.getStoreStatus() }); }
  catch (err) { res.status(500).json({ success: false, error: 'Store status failed', message: backtestController.formatBrokerError(err) }); }
}

module.exports = {
  runYtBacktestView,
  latestYtReportView,
  ytReportCsvView,
  seasonalityView,
  tiltStateView,
  setTiltView,
  resampledCandlesView,
  candleStatusView,
};
