'use strict';
const { getKiteWithAccessToken } = require('./kiteClient');

// Instrument tokens for index historical data
const INDEX_TOKENS = {
  NIFTY: 256265,
  BANKNIFTY: 260105,
  SENSEX:    265,      // BSE INDICES
};

/**
 * Fetch historical candles for NIFTY or BANKNIFTY from Zerodha.
 * from/to are unix seconds. `interval` is any Kite interval ('minute',
 * '3minute', '5minute', …) and defaults to 5-minute so existing callers are
 * unaffected. The scalp engine uses 'minute' — a 2-point premium target is
 * invisible at 5-minute resolution.
 */
async function fetchHistoricalCandles(symbol, fromUnix, toUnix, interval = '5minute') {
  const kite = getKiteWithAccessToken();
  const token = INDEX_TOKENS[symbol];
  if (!token) throw new Error(`Unknown symbol: ${symbol}`);

  const from = new Date(fromUnix * 1000);
  const to = new Date(toUnix * 1000);

  const raw = await kite.getHistoricalData(token, interval, from, to, false, false);

  if (!Array.isArray(raw)) return [];

  const candles = [];
  for (const row of raw) {
    const date = row.date instanceof Date ? row.date : new Date(row.date);
    if (isNaN(date.getTime())) continue;
    if (row.open == null || row.high == null || row.low == null || row.close == null) continue;
    candles.push({
      time: Math.floor(date.getTime() / 1000),
      open: row.open,
      high: row.high,
      low: row.low,
      close: row.close,
      volume: row.volume ?? 0,
    });
  }

  candles.sort((a, b) => a.time - b.time);
  return candles;
}

/**
 * Fetch 5-minute historical candles for a specific NFO option instrument.
 * Requires an instrument_token (from NfoInstrument table or getInstruments).
 * from/to are unix seconds.
 *
 * Returns same shape as fetchHistoricalCandles: [{time, open, high, low, close, volume}]
 */
async function fetchOptionCandles(instrumentToken, fromUnix, toUnix, interval = 'minute') {
  const kite = getKiteWithAccessToken();
  const from = new Date(fromUnix * 1000);
  const to   = new Date(toUnix   * 1000);

  // oi=true: each candle carries open interest — the option-chain signal
  // (writer build-up/unwind per strike, minute by minute) that quote
  // snapshots were too coarse and too stale to provide.
  const raw = await kite.getHistoricalData(instrumentToken, interval, from, to, false, true);

  if (!Array.isArray(raw)) return [];

  const candles = [];
  for (const row of raw) {
    const date = row.date instanceof Date ? row.date : new Date(row.date);
    if (isNaN(date.getTime())) continue;
    if (row.open == null || row.close == null) continue;
    candles.push({
      time:   Math.floor(date.getTime() / 1000),
      open:   row.open,
      high:   row.high,
      low:    row.low,
      close:  row.close,
      volume: row.volume ?? 0,
      oi:     row.oi ?? null,
    });
  }

  candles.sort((a, b) => a.time - b.time);
  return candles;
}

module.exports = {
  INDEX_TOKENS,
  fetchHistoricalCandles,
  fetchOptionCandles,
};
