'use strict';

/**
 * DB-backed candle store + resampler.
 *
 * The file archive under data/candle_cache is the portable copy; this service
 * mirrors it into Postgres (index_candles, option_candles) and serves candles
 * of ANY minute interval by resampling the 1-minute ground truth on demand.
 * Buckets are anchored at the session open (09:15 IST), so 5-min candles run
 * 09:15, 09:20, ... exactly as an exchange chart draws them.
 */

const { IndexCandle, OptionCandle } = require('../models');
const { IST } = require('../utils/optionMath');

const CHUNK = 2000;
const SESSION_OPEN_MIN = 9 * 60 + 15;   // 09:15 IST

// ---------------------------------------------------------------------------
// Upserts (idempotent — safe to re-import the same file any number of times)
// ---------------------------------------------------------------------------

async function upsertIndexCandles(symbol, candles) {
  let written = 0;
  for (let i = 0; i < candles.length; i += CHUNK) {
    const rows = candles.slice(i, i + CHUNK).map(c => ({
      symbol, time: c.time, open: c.open, high: c.high, low: c.low, close: c.close
    }));
    const res = await IndexCandle.bulkCreate(rows, { ignoreDuplicates: true });
    written += res.length;
  }
  return written;
}

async function upsertOptionCandles(meta, candles) {
  let written = 0;
  for (let i = 0; i < candles.length; i += CHUNK) {
    const rows = candles.slice(i, i + CHUNK).map(c => ({
      tradingsymbol: meta.tradingsymbol, expiry: meta.expiry,
      strike: meta.strike, type: meta.type,
      time: c.time, open: c.open, high: c.high, low: c.low, close: c.close,
      volume: c.volume ?? null, oi: c.oi ?? null
    }));
    const res = await OptionCandle.bulkCreate(rows, { ignoreDuplicates: true });
    written += res.length;
  }
  return written;
}

// ---------------------------------------------------------------------------
// Resampling — any minute interval from the 1-minute ground truth
// ---------------------------------------------------------------------------

/**
 * Buckets 1-min candles into `intervalMins` candles anchored at 09:15 IST.
 * open = first open, close = last close, high/low = extremes; a bucket's time
 * is its first minute's start, matching how exchanges label candles.
 */
function resample(oneMinCandles, intervalMins) {
  if (intervalMins <= 1) {
    return oneMinCandles;
  }
  const buckets = new Map();
  for (const c of oneMinCandles) {
    const istMinOfDay = Math.floor(((c.time + IST) % 86400) / 60);
    const day = Math.floor((c.time + IST) / 86400);
    const slot = Math.floor((istMinOfDay - SESSION_OPEN_MIN) / intervalMins);
    const key = `${day}:${slot}`;
    const b = buckets.get(key);
    if (!b) {
      buckets.set(key, { time: c.time, open: c.open, high: c.high, low: c.low, close: c.close,
        volume: c.volume ?? 0, oi: c.oi ?? null });
    } else {
      b.high = Math.max(b.high, c.high);
      b.low = Math.min(b.low, c.low);
      b.close = c.close;                        // candles arrive time-sorted
      b.volume += c.volume ?? 0;
      if (c.oi != null) {
        b.oi = c.oi;
      }            // OI is a level, take the latest
    }
  }
  return [...buckets.values()].sort((a, b) => a.time - b.time);
}

/** 1-min index candles from the DB for [fromUnix, toUnix], oldest first. */
async function getIndexCandles(symbol, fromUnix, toUnix) {
  const { Op } = require('sequelize');
  const rows = await IndexCandle.findAll({
    where: { symbol, time: { [Op.between]: [fromUnix, toUnix] } },
    order: [['time', 'ASC']],
    raw: true
  });
  return rows.map(r => ({
    time: Number(r.time), open: Number(r.open), high: Number(r.high),
    low: Number(r.low), close: Number(r.close)
  }));
}

async function getResampledIndexCandles(symbol, intervalMins, fromUnix, toUnix) {
  return resample(await getIndexCandles(symbol, fromUnix, toUnix), intervalMins);
}

async function storeStatus() {
  const bySymbol = {};
  for (const symbol of ['NIFTY', 'BANKNIFTY', 'SENSEX']) {
    const { Op, fn, col } = require('sequelize');
    const n = await IndexCandle.count({ where: { symbol } });
    if (!n) {
      bySymbol[symbol] = { rows: 0 }; continue;
    }
    const min = await IndexCandle.min('time', { where: { symbol } });
    const max = await IndexCandle.max('time', { where: { symbol } });
    bySymbol[symbol] = {
      rows: n,
      from: new Date(Number(min) * 1000).toISOString().slice(0, 10),
      to:   new Date(Number(max) * 1000).toISOString().slice(0, 10)
    };
  }
  return {
    index: bySymbol,
    optionRows: await OptionCandle.count(),
    optionContracts: (await OptionCandle.aggregate('tradingsymbol', 'count', { distinct: true }))
  };
}

/**
 * All harvested option contracts as in-memory series for backtests:
 * [{ sym, expiry, strike, type, byTime: Map<time, candle> }].
 */
async function loadOptionContractsFromDb() {
  const rows = await OptionCandle.findAll({ order: [['time', 'ASC']], raw: true });
  const bySym = new Map();
  for (const r of rows) {
    let c = bySym.get(r.tradingsymbol);
    if (!c) {
      c = { sym: r.tradingsymbol, expiry: r.expiry, strike: Number(r.strike),
        type: r.type, byTime: new Map(), first: Number(r.time) };
      bySym.set(r.tradingsymbol, c);
    }
    c.byTime.set(Number(r.time), {
      time: Number(r.time), open: Number(r.open), high: Number(r.high),
      low: Number(r.low), close: Number(r.close),
      volume: r.volume == null ? 0 : Number(r.volume),
      oi: r.oi == null ? null : Number(r.oi)
    });
  }
  return [...bySym.values()];
}

module.exports = {
  upsertIndexCandles, upsertOptionCandles,
  resample,
  getIndexCandles, getResampledIndexCandles,
  loadOptionContractsFromDb,
  storeStatus
};
