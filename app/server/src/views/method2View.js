'use strict';

// View layer for Method 2: owns req/res only. These endpoints deliberately
// return the engine's RAW JSON body (no { success, data } envelope) and the
// exact status codes / error shapes the legacy handlers returned, because the
// dashboard reads fields off the top level and the response is the frozen
// contract under migration. getZerodhaErrorMessage is the broker's public
// error formatter, used here exactly where the legacy route handlers used it.
const logger = require('@startup/logger');
const method2Controller = require('../controllers/method2Controller');
const { getZerodhaErrorMessage } = require('../services/broker');

async function getMethod2View(_req, res) {
  try {
    res.json(await method2Controller.getMethod2());
  } catch (err) {
    res.status(502).json({ error: 'Method 2 analysis failed', message: err instanceof Error ? err.message : 'Unknown error' });
  }
}

async function getPulseView(_req, res) {
  try {
    res.json(await method2Controller.getPulse());
  } catch (err) {
    res.status(500).json({ error: 'Pulse failed', message: err.message });
  }
}

async function getAutotradeStateView(_req, res) {
  try {
    res.json(await method2Controller.getAutotradeState());
  } catch (err) {
    res.status(500).json({ error: 'Autotrade state failed', message: err.message });
  }
}

async function setAutotradeModeView(req, res) {
  try {
    res.json(await method2Controller.setAutotradeMode(req.body?.mode));
  } catch (err) {
    res.status(400).json({ error: 'Autotrade mode failed', message: err.message });
  }
}

async function catchUpView(_req, res) {
  try {
    res.json(await method2Controller.catchUp());
  } catch (err) {
    if (err.noActive) {
      return res.status(400).json({ error: 'No active trade to catch up' });
    }
    res.status(400).json({ error: 'Catch-up refused', message: err.message });
  }
}

async function modifyGttView(req, res) {
  try {
    res.json(await method2Controller.modifyGtt(req.body ?? {}));
  } catch (err) {
    res.status(400).json({ error: 'GTT modify failed', message: err.message });
  }
}

async function getDaybookView(_req, res) {
  try {
    res.json(await method2Controller.getDaybook());
  } catch (err) {
    res.status(500).json({ error: 'Daybook failed', message: err.message });
  }
}

// ── Method 2 one-year backtest ───────────────────────────────────────────────
async function runMethod2YearView(req, res) {
  try {
    logger.info('[m2year] running year backtest…');
    res.json(await method2Controller.runMethod2Year(req.body ?? {}));
  } catch (err) {
    res.status(502).json({ error: 'Year backtest failed', message: getZerodhaErrorMessage(err) });
  }
}
async function latestMethod2YearView(_req, res) {
  try {
    const row = await method2Controller.latestMethod2Year();
    if (!row) return res.status(404).json({ error: 'No year backtest yet — run it first' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: 'Fetch failed', message: getZerodhaErrorMessage(err) });
  }
}
async function method2YearCsvView(_req, res) {
  try {
    const out = await method2Controller.method2YearCsv();
    if (!out) return res.status(404).send('No year backtest yet');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${out.filename}"`);
    res.send(out.csv);
  } catch (err) {
    res.status(500).send('CSV failed: ' + err.message);
  }
}

// ── Method 3 "prime" year backtest ───────────────────────────────────────────
async function runMethod3YearView(req, res) {
  try {
    logger.info('[m3year] running Method 3 year backtest…');
    res.json(await method2Controller.runMethod3Year(req.body ?? {}));
  } catch (err) {
    res.status(502).json({ error: 'Method 3 backtest failed', message: getZerodhaErrorMessage(err) });
  }
}
async function latestMethod3YearView(_req, res) {
  try {
    const row = await method2Controller.latestMethod3Year();
    if (!row) return res.status(404).json({ error: 'No Method 3 backtest yet — run it first' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: 'Fetch failed', message: err.message });
  }
}
async function method3YearCsvView(_req, res) {
  try {
    const out = await method2Controller.method3YearCsv();
    if (!out) return res.status(404).send('No Method 3 backtest yet');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${out.filename}"`);
    res.send(out.csv);
  } catch (err) {
    res.status(500).send('CSV failed: ' + err.message);
  }
}

// ── Method 2 + discipline year backtest ──────────────────────────────────────
async function runMethod2PlusYearView(req, res) {
  try {
    logger.info('[m2plus] running Method 2 + discipline year backtest…');
    res.json(await method2Controller.runMethod2PlusYear(req.body ?? {}));
  } catch (err) {
    res.status(502).json({ error: 'Method 2+ backtest failed', message: getZerodhaErrorMessage(err) });
  }
}
async function latestMethod2PlusYearView(_req, res) {
  try {
    const row = await method2Controller.latestMethod2PlusYear();
    if (!row) return res.status(404).json({ error: 'No Method 2+ backtest yet — run it first' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: 'Fetch failed', message: err.message });
  }
}
async function method2PlusYearCsvView(_req, res) {
  try {
    const out = await method2Controller.method2PlusYearCsv();
    if (!out) return res.status(404).send('No Method 2+ backtest yet');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${out.filename}"`);
    res.send(out.csv);
  } catch (err) {
    res.status(500).send('CSV failed: ' + err.message);
  }
}

module.exports = {
  getMethod2View,
  getPulseView,
  getAutotradeStateView,
  setAutotradeModeView,
  catchUpView,
  modifyGttView,
  getDaybookView,
  runMethod2YearView, latestMethod2YearView, method2YearCsvView,
  runMethod3YearView, latestMethod3YearView, method3YearCsvView,
  runMethod2PlusYearView, latestMethod2PlusYearView, method2PlusYearCsvView,
};
