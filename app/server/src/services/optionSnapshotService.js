'use strict';

// Option-snapshot collection + OI-change read paths. This is the ONE service
// that touches the OptionSnapshot model (collect, getOiChangeAnalysis,
// getRecentSnapshots); the pure analytics transforms live in ./optionSnapshot/
// analytics and are re-exported here so the public surface is unchanged.
//
// Boot note: market_data/nseService top-level-requires this module at exactly
// ../optionSnapshotService, so this file must stay flat at this path.

const path = require('path');
const dotenv = require('dotenv');
const { Op } = require('sequelize');
const logger = require('@startup/logger');
const db = require('../models');
const { OptionSnapshot } = db;
const {
  getZerodhaErrorMessage,
  getNearestExpiryNiftyOptions,
  getOptionQuotesByTradingSymbols,
  isZerodhaTokenError,
} = require('./broker');
const analytics = require('./optionSnapshot/analytics');

const OPTION_SNAPSHOT_INTERVAL_MS = 2 * 60 * 1000;
/** Avoid spamming logs every 2 minutes while token is invalid */
const ZERODHA_TOKEN_ERROR_LOG_THROTTLE_MS = 10 * 60 * 1000;

let optionSnapshotInterval = null;
let lastZerodhaTokenErrorLogAt = 0;

function reloadEnvForZerodhaToken() {
  try {
    dotenv.config({ path: path.join(process.cwd(), ".env"), override: true });
  } catch (err) {
    logger.error(`[optionSnapshot] Failed to reload .env (Zerodha token may be stale): ${err instanceof Error ? err.message : String(err)}`);
  }
}

function logZerodhaTokenErrorThrottled(err) {
  const now = Date.now();
  if (now - lastZerodhaTokenErrorLogAt < ZERODHA_TOKEN_ERROR_LOG_THROTTLE_MS) {
    return;
  }
  lastZerodhaTokenErrorLogAt = now;
  logger.error(`[optionSnapshot] Zerodha token invalid — option snapshots skipped until token works. ${getZerodhaErrorMessage(err)}. Visit /auth/zerodha/login, finish login, save ZERODHA_ACCESS_TOKEN in .env. Token is reloaded before each snapshot attempt (restart optional). throttleMs=${ZERODHA_TOKEN_ERROR_LOG_THROTTLE_MS}`);
}

async function collectNiftyOptionSnapshots() {
  reloadEnvForZerodhaToken();
  const snapshotTime = new Date();
  logger.info("[optionSnapshot] Fetching nearest-expiry NIFTY option snapshot...");

  try {
    const optionSlice = await getNearestExpiryNiftyOptions(10);
    const quotes = await getOptionQuotesByTradingSymbols(
      optionSlice.options.map((option) => option.tradingsymbol)
    );

    const rowsToInsert = optionSlice.options.flatMap((option) => {
      const quote = quotes[option.tradingsymbol];

      if (!quote) {
        logger.error(`[optionSnapshot] Quote missing for symbol ${option.tradingsymbol}`);
        return [];
      }

      if (quote.oi == null || quote.ltp == null) {
        logger.error(`[optionSnapshot] Skipping snapshot due to incomplete quote tradingsymbol=${option.tradingsymbol} oi=${quote.oi} ltp=${quote.ltp}`);
        return [];
      }

      return [
        {
          expiry: optionSlice.selectedExpiry,
          strike: option.strike,
          type: option.optionType,
          oi: quote.oi,
          ltp: quote.ltp,
          timestamp: snapshotTime,
        },
      ];
    });

    const skipped = optionSlice.options.length - rowsToInsert.length;

    if (rowsToInsert.length === 0) {
      logger.error(`[optionSnapshot] No valid option snapshots to store selectedExpiry=${optionSlice.selectedExpiry} atmStrike=${optionSlice.atmStrike}`);
      return {
        inserted: 0,
        skipped,
        atmStrike: optionSlice.atmStrike,
        selectedExpiry: optionSlice.selectedExpiry,
        snapshotTime,
      };
    }

    await OptionSnapshot.bulkCreate(rowsToInsert);
    lastZerodhaTokenErrorLogAt = 0;
    logger.info(`[optionSnapshot] Snapshot rows stored inserted=${rowsToInsert.length} skipped=${skipped} selectedExpiry=${optionSlice.selectedExpiry} atmStrike=${optionSlice.atmStrike} timestamp=${snapshotTime.toISOString()}`);

    return {
      inserted: rowsToInsert.length,
      skipped,
      atmStrike: optionSlice.atmStrike,
      selectedExpiry: optionSlice.selectedExpiry,
      snapshotTime,
    };
  } catch (err) {
    logger.error(`[optionSnapshot] Failed to fetch/store option snapshots: ${err instanceof Error ? err.message : String(err)}`);
    throw err;
  }
}

async function runOptionSnapshotCollectorOnce() {
  return collectNiftyOptionSnapshots();
}

function startOptionSnapshotScheduler() {
  if (optionSnapshotInterval) {
    return;
  }

  logger.info("[optionSnapshot] Starting scheduler (every 2 minutes)");
  void collectNiftyOptionSnapshots().catch((err) => {
    if (isZerodhaTokenError(err)) {
      logZerodhaTokenErrorThrottled(err);
      return;
    }

    logger.error(`[optionSnapshot] Initial scheduled run failed: ${err instanceof Error ? err.message : String(err)}`);
  });

  optionSnapshotInterval = setInterval(() => {
    void collectNiftyOptionSnapshots().catch((err) => {
      if (isZerodhaTokenError(err)) {
        logZerodhaTokenErrorThrottled(err);
        return;
      }

      logger.error(`[optionSnapshot] Scheduled run failed: ${err instanceof Error ? err.message : String(err)}`);
    });
  }, OPTION_SNAPSHOT_INTERVAL_MS);
}

// ---------------------------------------------------------------------------
// OI Change Analysis
// ---------------------------------------------------------------------------

function interpretOiChange(oiChange, ltpChange, optionType) {
  if (Math.abs(oiChange) < 100) return 'no-change';

  const oiUp = oiChange > 0;
  const priceUp = ltpChange > 0;

  if (optionType === 'CE') {
    if (oiUp && priceUp) return 'long-buildup';      // Fresh CE buying = bullish
    if (oiUp && !priceUp) return 'short-buildup';     // CE writing = bearish
    if (!oiUp && priceUp) return 'short-covering';    // CE shorts covering = bullish
    return 'long-unwinding';                           // CE longs exiting = bearish
  } else {
    if (oiUp && priceUp) return 'short-buildup';      // PE writing = bullish
    if (oiUp && !priceUp) return 'long-buildup';      // Fresh PE buying = bearish
    if (!oiUp && !priceUp) return 'long-unwinding';   // PE longs exiting = bullish
    return 'short-covering';                           // PE shorts covering = bearish
  }
}

async function getOiChangeAnalysis() {
  const weight = Number(process.env.OI_CHANGE_CONFIDENCE_WEIGHT) || 8;

  try {
    // Get 2 most recent distinct timestamps
    const recentTimestamps = await OptionSnapshot.findAll({
      attributes: [[db.sequelize.fn('DISTINCT', db.sequelize.col('timestamp')), 'timestamp']],
      order: [['timestamp', 'DESC']],
      limit: 2,
      raw: true,
    });

    if (recentTimestamps.length < 2) {
      return { atmStrike: null, changes: [], overallBias: 'neutral', confidenceContribution: 0, error: 'Insufficient snapshots (need at least 2)' };
    }

    const currentTs = recentTimestamps[0].timestamp;
    const previousTs = recentTimestamps[1].timestamp;

    const [currentSnapshots, previousSnapshots] = await Promise.all([
      OptionSnapshot.findAll({ where: { timestamp: currentTs }, raw: true }),
      OptionSnapshot.findAll({ where: { timestamp: previousTs }, raw: true }),
    ]);

    // Build lookup for previous snapshots
    const prevMap = new Map();
    for (const s of previousSnapshots) {
      prevMap.set(`${s.strike}-${s.type}`, { oi: Number(s.oi), ltp: Number(s.ltp) });
    }

    const changes = [];
    let bullishCount = 0;
    let bearishCount = 0;

    for (const s of currentSnapshots) {
      const key = `${s.strike}-${s.type}`;
      const prev = prevMap.get(key);
      if (!prev) continue;

      const currentOi = Number(s.oi);
      const previousOi = prev.oi;
      const oiChange = currentOi - previousOi;
      const oiChangePct = previousOi > 0 ? (oiChange / previousOi) * 100 : 0;
      const currentLtp = Number(s.ltp);
      const previousLtp = prev.ltp;
      const ltpChange = currentLtp - previousLtp;
      const interpretation = interpretOiChange(oiChange, ltpChange, s.type);

      changes.push({
        strike: s.strike,
        type: s.type,
        currentOi,
        previousOi,
        oiChange,
        oiChangePct: Number(oiChangePct.toFixed(2)),
        currentLtp,
        previousLtp,
        ltpChange: Number(ltpChange.toFixed(2)),
        interpretation,
      });

      // Score bias: CE long-buildup/short-covering = bullish, CE short-buildup/long-unwinding = bearish (and vice versa for PE)
      if (s.type === 'CE') {
        if (interpretation === 'long-buildup' || interpretation === 'short-covering') bullishCount++;
        else if (interpretation === 'short-buildup' || interpretation === 'long-unwinding') bearishCount++;
      } else {
        if (interpretation === 'short-buildup' || interpretation === 'short-covering') bullishCount++;
        else if (interpretation === 'long-buildup' || interpretation === 'long-unwinding') bearishCount++;
      }
    }

    let overallBias = 'neutral';
    if (bullishCount > bearishCount + 2) overallBias = 'bullish';
    else if (bearishCount > bullishCount + 2) overallBias = 'bearish';

    const biasDelta = Math.abs(bullishCount - bearishCount);
    const total = bullishCount + bearishCount;
    const biasStrength = total > 0 ? biasDelta / total : 0;
    const confidenceContribution = Math.round(weight * Math.min(1, biasStrength));

    // ATM strike estimate from the middle strike in changes
    const strikeList = [...new Set(changes.map((c) => c.strike))].sort((a, b) => a - b);
    const atmStrike = strikeList.length > 0 ? strikeList[Math.floor(strikeList.length / 2)] : null;

    // Aggregate per-interpretation counts for UI consumption
    const summary = { longBuildup: 0, shortBuildup: 0, shortCovering: 0, longUnwinding: 0 };
    const CAMEL = {
      'long-buildup':   'longBuildup',
      'short-buildup':  'shortBuildup',
      'short-covering': 'shortCovering',
      'long-unwinding': 'longUnwinding',
    };
    for (const c of changes) {
      const k = CAMEL[c.interpretation];
      if (k) summary[k] += 1;
    }

    // `strikes` is exposed so the dashboard can render the top per-strike rows;
    // sort by absolute OI delta so the most active strikes come first.
    const strikes = [...changes].sort((a, b) => Math.abs(b.oiChange) - Math.abs(a.oiChange));

    return { atmStrike, changes, strikes, summary, overallBias, confidenceContribution };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`[optionSnapshot] getOiChangeAnalysis failed: ${message}`);
    return { atmStrike: null, changes: [], overallBias: 'neutral', confidenceContribution: 0, error: message };
  }
}

// ---------------------------------------------------------------------------
// Recent snapshot reads (moved verbatim from marketController so OptionSnapshot
// model access stays in this one service). The view owns parsing/validation.
// ---------------------------------------------------------------------------

const RECENT_OPTION_SNAPSHOT_LIMIT = 200;

async function getRecentSnapshots({ limit, strike, expiry, type, from, to } = {}) {
  const effectiveLimit = limit == null ? RECENT_OPTION_SNAPSHOT_LIMIT : limit;

  const where = {};
  if (expiry) {
    where.expiry = expiry;
  }
  if (typeof strike === "number") {
    where.strike = strike;
  }
  if (type) {
    where.type = type;
  }
  if (from || to) {
    where.timestamp = {
      ...(from ? { [Op.gte]: from } : {}),
      ...(to ? { [Op.lte]: to } : {}),
    };
  }

  const queryOptions = {
    attributes: ["expiry", "strike", "type", "oi", "ltp", "timestamp"],
    order: [["timestamp", "DESC"]],
    limit: effectiveLimit,
  };
  if (Object.keys(where).length > 0) {
    queryOptions.where = where;
  }

  const snapshots = await OptionSnapshot.findAll(queryOptions);

  return snapshots.map((snapshot) => ({
    expiry: snapshot.expiry,
    strike: Number(snapshot.strike),
    type: snapshot.type,
    oi: Number(snapshot.oi),
    ltp: Number(snapshot.ltp),
    timestamp: snapshot.timestamp,
  }));
}

module.exports = {
  collectNiftyOptionSnapshots,
  runOptionSnapshotCollectorOnce,
  startOptionSnapshotScheduler,
  getOiChangeAnalysis,
  getRecentSnapshots,
  RECENT_OPTION_SNAPSHOT_LIMIT,
  isZerodhaTokenError,
  ...analytics,
};
