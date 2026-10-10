'use strict';

/**
 * Live index strip for the header clock: spot, % on the day, day's open.
 *
 * Anchors (open, previous close) change once per day — one REST quote per IST
 * date, cached. Spot rides the websocket chain when this process runs the
 * ticker (zero API cost); when it doesn't (the sidecar), a short-cached REST
 * quote fills in. % change is against the previous close, as every terminal
 * quotes it.
 */

const { KiteConnect } = require('kiteconnect');
const brokerCredentials = require('../config/brokerCredentials');
const tickerService = require('./tickerService');

const KEYS = { NIFTY: 'NSE:NIFTY 50', BANKNIFTY: 'NSE:NIFTY BANK' };

let anchorCache = { date: null, data: null };
let restSpotCache = { at: 0, data: null };

const istDate = () => new Date(Date.now() + 19800 * 1000).toISOString().slice(0, 10);

async function restQuotes() {
  // Credentials come from Company Settings (Company Profile → trading) via the
  // synchronous, hot-reloading broker-credentials cache — the access token is
  // picked up immediately after Zerodha login with no restart.
  const creds = brokerCredentials.getBrokerCreds();
  const kite = new KiteConnect({ api_key: creds.apiKey });
  kite.setAccessToken(creds.accessToken);
  return kite.getQuote(Object.values(KEYS));
}

async function getAnchors() {
  const today = istDate();
  if (anchorCache.date === today && anchorCache.data) return anchorCache.data;
  const q = await restQuotes();
  const data = {};
  for (const [sym, key] of Object.entries(KEYS)) {
    const r = q[key];
    if (r?.ohlc) data[sym] = { open: r.ohlc.open, prevClose: r.ohlc.close, last: r.last_price };
  }
  if (Object.keys(data).length === 2) anchorCache = { date: today, data };
  restSpotCache = { at: Date.now(), data };   // the same call is a fresh spot too
  return data;
}

async function getSpotSummary() {
  const anchors = await getAnchors();
  const out = { at: Date.now() };
  for (const sym of Object.keys(KEYS)) {
    const a = anchors[sym];
    if (!a) continue;
    // websocket spot when this process runs the ticker and it is fresh
    let spot = null, source = 'ws';
    try {
      const c = tickerService.getChain(sym);
      if (c.spot != null && c.spotAgeMs != null && c.spotAgeMs < 10000) spot = c.spot;
    } catch { /* ticker not running here */ }
    if (spot == null) {
      // REST fallback, cached a few seconds so a 1s-polling widget stays polite
      if (Date.now() - restSpotCache.at > 3000) {
        try {
          const q = await restQuotes();
          const data = {};
          for (const [s2, key] of Object.entries(KEYS)) data[s2] = { last: q[key]?.last_price };
          restSpotCache = { at: Date.now(), data };
        } catch { /* keep the stale cache */ }
      }
      spot = restSpotCache.data?.[sym]?.last ?? a.last;
      source = 'rest';
    }
    out[sym] = {
      spot, open: a.open, prevClose: a.prevClose,
      changePct: a.prevClose ? +((spot - a.prevClose) / a.prevClose * 100).toFixed(2) : null,
      source,
    };
  }
  return out;
}

module.exports = { getSpotSummary };
