'use strict';

/**
 * Historical data archive — builds the dataset future backtests run on.
 * Storage is Postgres ONLY (index_candles / option_candles); no files.
 *
 * Two facts drive the design (both verified against the live API):
 *   - 1-minute INDEX candles are available from Zerodha back to 2015, any time.
 *   - 1-minute OPTION candles are PURGED once a contract expires. If we do not
 *     capture them while the contract is alive, they are gone forever — which
 *     is why every backtest before this archive had to fake premiums with
 *     Black-Scholes.
 *
 * So: index history is backfilled on demand, option history is harvested every
 * evening for the contracts around ATM. Upserts are idempotent (unique on
 * symbol+time / tradingsymbol+time), so re-runs are safe and gaps self-heal
 * while a contract is still alive.
 */

const logger = require('@startup/logger');
const { fetchHistoricalCandles, fetchOptionCandles } = require('@appServer/interfaces/broker');
const { upsertIndexCandles, upsertOptionCandles, storeStatus } = require('./candleStoreService');
const { NfoInstrument } = require('../models');
const { Op } = require('sequelize');

const REQUEST_GAP_MS = 350;             // ~3 req/s historical API limit
const CHUNK_DAYS = 55;                  // 60-day cap per minute-data request
const ATM_STRIKE_SPAN = 500;            // harvest strikes within +/- this of spot

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Index candles — backfill any range straight into the DB
// ---------------------------------------------------------------------------

async function archiveIndexCandles(symbol = 'NIFTY', days = 400) {
  const to = Math.floor(Date.now() / 1000);
  const from = to - days * 24 * 3600;

  const chunks = [];
  let end = to;
  while (end > from) {
    const start = Math.max(from, end - CHUNK_DAYS * 24 * 3600);
    chunks.unshift({ from: start, to: end });
    end = start - 1;
  }

  let fetched = 0, dbRows = 0;
  for (const ch of chunks) {
    const candles = await fetchHistoricalCandles(symbol, ch.from, ch.to, 'minute');
    fetched += candles.length;
    dbRows += await upsertIndexCandles(symbol, candles);
    await sleep(REQUEST_GAP_MS);
  }
  logger.info(`[archive] ${symbol}: fetched ${fetched} 1-min candles over ${days}d, ${dbRows} rows written`);
  return { symbol, days, fetched, dbRowsWritten: dbRows };
}

// ---------------------------------------------------------------------------
// Option candles — harvest near-ATM contracts while they are alive
// ---------------------------------------------------------------------------

/**
 * Contracts worth harvesting today: everything within ATM_STRIKE_SPAN of spot,
 * for the two nearest expiries, using the latest nfo_instruments snapshot.
 */
async function selectHarvestContracts(symbol = 'NIFTY') {
  // Spot from the latest 1-minute candle — works during and after the session.
  const now = Math.floor(Date.now() / 1000);
  const recent = await fetchHistoricalCandles(symbol, now - 3 * 24 * 3600, now, 'minute');
  const spot = recent.length ? recent[recent.length - 1].close : null;
  if (!Number.isFinite(spot)) {
    throw new Error(`No spot for ${symbol}`);
  }

  const today = new Date().toISOString().slice(0, 10);
  const latestSnap = await NfoInstrument.max('snapshot_date');
  if (!latestSnap) {
    throw new Error(`nfo_instruments is empty — run the snapshot first`);
  }

  const rows = await NfoInstrument.findAll({
    where: {
      snapshot_date: latestSnap,
      name: symbol,
      instrument_type: { [Op.in]: ['CE', 'PE'] },
      expiry: { [Op.gte]: today },
      strike: { [Op.between]: [spot - ATM_STRIKE_SPAN, spot + ATM_STRIKE_SPAN] }
    },
    order: [['expiry', 'ASC'], ['strike', 'ASC']],
    raw: true
  });

  const expiries = [...new Set(rows.map(r => r.expiry))].slice(0, 2);
  const picked = rows.filter(r => expiries.includes(r.expiry));

  // Front-month FUTURES too: futures OI is the positioning signal the option
  // chain cannot show (no strike games), and like option candles it can only
  // be collected while the contract lives. Costs one extra fetch per day.
  const futs = await NfoInstrument.findAll({
    where: { snapshot_date: latestSnap, name: symbol, instrument_type: 'FUT', expiry: { [Op.gte]: today } },
    order: [['expiry', 'ASC']], limit: 1, raw: true
  });
  return { spot, contracts: [...picked, ...futs] };
}

/**
 * Fetches each selected contract's full life-to-date of 1-minute candles
 * (with per-minute OI) and upserts them. Run daily; safe mid-session too.
 */
async function archiveOptionCandles(symbol = 'NIFTY') {
  const { spot, contracts } = await selectHarvestContracts(symbol);
  const to = Math.floor(Date.now() / 1000);
  const from = to - 10 * 24 * 3600;    // covers a weekly contract's whole life

  let saved = 0, empty = 0, failed = 0, dbRows = 0;
  for (const c of contracts) {
    try {
      const candles = await fetchOptionCandles(c.instrument_token, from, to);
      if (candles.length === 0) {
        empty++; continue;
      }
      dbRows += await upsertOptionCandles({
        tradingsymbol: c.tradingsymbol, expiry: String(c.expiry),
        strike: Number(c.strike), type: c.instrument_type
      }, candles);
      saved++;
    } catch (err) {
      failed++;
      logger.error(`[archive] ${c.tradingsymbol} failed: ${err.message ?? err}`, err);
    }
    await sleep(REQUEST_GAP_MS);
  }
  logger.info(`[archive] options ${symbol}: spot=${spot} contracts=${contracts.length} saved=${saved} empty=${empty} failed=${failed} rows=${dbRows}`);
  return { symbol, spot, contracts: contracts.length, saved, empty, failed, dbRowsWritten: dbRows };
}

/** Nightly run: top up all index series and harvest live option contracts. */
async function runNightlyArchive() {
  const out = {};
  out.nifty = await archiveIndexCandles('NIFTY', 7);
  out.banknifty = await archiveIndexCandles('BANKNIFTY', 7);
  out.sensex = await archiveIndexCandles('SENSEX', 7);
  out.niftyOptions = await archiveOptionCandles('NIFTY');
  return out;
}

/** What the DB archive holds. */
async function archiveStatus() {
  return storeStatus();
}

module.exports = {
  archiveIndexCandles,
  archiveOptionCandles,
  runNightlyArchive,
  archiveStatus
};
