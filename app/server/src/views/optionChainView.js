'use strict';

// View layer for the option-chain / OI endpoints: owns req/res only. The
// request-validation here is preserved verbatim from the legacy marketController
// and the inline index.js chain handlers; the raw response shapes (bare arrays,
// { bookmarks }, { ok }, raw { error, message }) are kept exactly as the source
// returned them so existing clients are unaffected. See FINDINGS — these do not
// use the framework { success, data } envelope on purpose.
const logger = require('@startup/logger');
const optionChainController = require('../controllers/optionChainController');
const { getZerodhaErrorMessage } = require('../services/broker');

function parsePositiveInteger(value) {
  if (typeof value !== "string" || !/^\d+$/.test(value.trim())) {
    return null;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseDateOnly(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return value;
}

function parseTimestamp(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return null;
  }

  const parsedDate = /^\d+$/.test(trimmedValue)
    ? new Date(Number(trimmedValue))
    : new Date(trimmedValue);

  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

async function getRecentOptionSnapshotsView(req, res) {
  const limit = req.query.limit == null ? null : parsePositiveInteger(req.query.limit);
  const strike = req.query.strike == null ? undefined : parsePositiveInteger(req.query.strike);
  const expiry = req.query.expiry == null ? undefined : parseDateOnly(req.query.expiry);
  const from = req.query.from == null ? undefined : parseTimestamp(req.query.from);
  const to = req.query.to == null ? undefined : parseTimestamp(req.query.to);
  const type =
    req.query.type == null
      ? undefined
      : typeof req.query.type === "string" && (req.query.type === "CE" || req.query.type === "PE")
        ? req.query.type
        : null;

  if (req.query.limit != null && limit == null) {
    res.status(400).json({ error: "Invalid limit", message: "limit must be a positive integer" });
    return;
  }

  if (req.query.strike != null && strike == null) {
    res.status(400).json({ error: "Invalid strike", message: "strike must be a positive integer" });
    return;
  }

  if (req.query.expiry != null && expiry == null) {
    res.status(400).json({ error: "Invalid expiry", message: "expiry must be a valid date in YYYY-MM-DD format" });
    return;
  }

  if (type === null) {
    res.status(400).json({ error: "Invalid type", message: "type must be CE or PE" });
    return;
  }

  if (req.query.from != null && from == null) {
    res.status(400).json({
      error: "Invalid from",
      message: "from must be a valid ISO timestamp or milliseconds value",
    });
    return;
  }

  if (req.query.to != null && to == null) {
    res.status(400).json({
      error: "Invalid to",
      message: "to must be a valid ISO timestamp or milliseconds value",
    });
    return;
  }

  if (from && to && from.getTime() > to.getTime()) {
    res.status(400).json({
      error: "Invalid time range",
      message: "from must be less than or equal to to",
    });
    return;
  }

  logger.info(`[GET /market/nifty/snapshots] Fetching recent option snapshots limit=${limit ?? null} expiry=${expiry ?? null} strike=${strike ?? null} type=${type ?? null} from=${from?.toISOString() ?? null} to=${to?.toISOString() ?? null}`);

  try {
    const snapshots = await optionChainController.getRecentSnapshots({ limit, strike, expiry, type, from, to });
    res.json(snapshots);
  } catch (err) {
    logger.error(`[GET /market/nifty/snapshots] Failed to fetch option snapshots: ${err instanceof Error ? err.message : String(err)}`);
    res.status(500).json({
      error: "Failed to fetch option snapshots",
      message: err instanceof Error ? err.message : "Unknown error",
    });
  }
}

function getLiveChainView(req, res) {
  res.json(optionChainController.getLiveChain(req.query.symbol === 'BANKNIFTY' ? 'BANKNIFTY' : 'NIFTY'));
}

async function getBookmarksView(_req, res) {
  try {
    res.json(await optionChainController.getBookmarks());
  } catch (err) {
    res.status(500).json({ error: 'Bookmarks fetch failed', message: getZerodhaErrorMessage(err) });
  }
}

async function saveBookmarksView(req, res) {
  try {
    const list = req.body?.bookmarks;
    if (!Array.isArray(list) || list.length > 100 || list.some(x => typeof x !== 'string' || x.length > 32)) {
      return res.status(400).json({ error: 'bookmarks must be an array of short strings' });
    }
    res.json(await optionChainController.saveBookmarks(list));
  } catch (err) {
    res.status(500).json({ error: 'Bookmarks save failed', message: getZerodhaErrorMessage(err) });
  }
}

async function getSpreadSummaryView(req, res) {
  try {
    const symbol = req.query.symbol === 'BANKNIFTY' ? 'BANKNIFTY' : 'NIFTY';
    const premMin = Number(req.query.premMin ?? 50);
    const premMax = Number(req.query.premMax ?? 250);
    res.json(await optionChainController.getSpreadSummary({ symbol, premMin, premMax }));
  } catch (err) {
    res.status(500).json({ error: 'Spread summary failed', message: getZerodhaErrorMessage(err) });
  }
}

async function runChainBenchmarkView(_req, res) {
  try {
    res.json(await optionChainController.runChainBenchmark());
  } catch (err) {
    res.status(502).json({ error: 'Chain benchmark failed', message: getZerodhaErrorMessage(err) });
  }
}

function getFeedStatusView(_req, res) {
  res.json(optionChainController.getFeedStatus());
}

module.exports = {
  getRecentOptionSnapshotsView,
  getLiveChainView,
  getBookmarksView,
  saveBookmarksView,
  getSpreadSummaryView,
  runChainBenchmarkView,
  getFeedStatusView,
};
