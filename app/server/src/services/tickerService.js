'use strict';

/**
 * Our own option chain, streamed — not polled.
 *
 * Kite's REST quote API allows ~1 request/second, so "refresh every second"
 * by polling would pin the rate limit and starve every other consumer. The
 * WebSocket ticker inverts the model: subscribe once to the chain's
 * instrument tokens and Zerodha PUSHES ticks (often several per second) with
 * LTP, OI and volume. The chain lives in this process's memory; the UI reads
 * a memory snapshot every second at zero API cost.
 *
 * Subscription: NIFTY spot + every CE/PE of the nearest expiry within ±800
 * of spot (from the daily nfo_instruments snapshot). The strike window
 * re-centers every 5 minutes as spot drifts. Auto-reconnects; a dead daily
 * token surfaces as connected:false — the login callback restarts us.
 */

const { KiteTicker } = require('kiteconnect');
const { Op } = require('sequelize');
const logger = require('@startup/logger');
// One-model-per-service is violated here (NfoInstrument, ChainOiBaseline,
// SpreadSample) — carried over verbatim from the live-feed source. See
// MIGRATION FINDINGS: split into per-model sibling services later.
const { NfoInstrument, ChainOiBaseline, SpreadSample } = require('../models');
const brokerCredentials = require('../config/brokerCredentials');
const { isMarketOpen } = require('../utils/optionMath');

// Both index chains ride the same websocket (it takes up to 3000 tokens).
// Strike spans differ because the strike steps differ (NIFTY 50, BN 100).
const SYMBOLS = {
  NIFTY:     { spotToken: 256265, span: 800,  defaultSpot: 23000 },
  BANKNIFTY: { spotToken: 260105, span: 1800, defaultSpot: 55500 }
};
const SPOT_TOKENS = new Map(Object.entries(SYMBOLS).map(([k, v]) => [v.spotToken, k]));
const RECENTER_MS = 5 * 60 * 1000;

let ticker = null;
let connected = false;
let lastError = null;
let recenterTimer = null;
let healthTimer = null;
let lastStartAt = 0;
let lastAnyTickAt = 0;
let subscribedTokens = new Set();

// A websocket can go half-dead: the TCP pipe stalls without ever emitting
// 'close', so autoReconnect never fires and `connected` stays true while no
// tick arrives (seen live: chain frozen 37 minutes at "connected"). The only
// truth is tick recency — if spot is silent this long in market hours, the
// connection is dead no matter what it claims.
// Tightened Sep 29 after repeated mid-session freezes: the index prints every
// second in market hours, so 45s of silence is definitively a dead pipe, and
// waiting longer only lengthens the outage the healer exists to end.
const STALE_MS = 45 * 1000;
const STARTUP_GRACE_MS = 75 * 1000;

// token -> { symbol, tradingsymbol, strike, type, expiry, ltp, oi, oiOpen,
//            volume, prevClose, lastTickAt }
const state = new Map();
const spots = { NIFTY: { price: null, at: 0 }, BANKNIFTY: { price: null, at: 0 } };

// tradingsymbol -> day-open OI (persisted; survives restarts)
let oiBaselines = new Map();
let baselineDate = null;
const pendingBaselines = [];

// tradingsymbol -> running per-minute spread aggregate
const spreadAgg = new Map();
let flushTimer = null;

function todayIst() {
  return new Date(Date.now() + 19800 * 1000).toISOString().slice(0, 10);
}

async function loadBaselines() {
  baselineDate = todayIst();
  oiBaselines = new Map();
  const rows = await ChainOiBaseline.findAll({ where: { date: baselineDate }, raw: true });
  for (const r of rows) {
    oiBaselines.set(r.tradingsymbol, Number(r.oi));
  }
  logger.info(`[ticker] loaded ${oiBaselines.size} OI baselines for ${baselineDate}`);
}

function noteBaseline(sym, oi) {
  if (baselineDate !== todayIst()) {
    oiBaselines = new Map(); baselineDate = todayIst();
  }
  if (oiBaselines.has(sym)) {
    return;
  }
  oiBaselines.set(sym, oi);
  pendingBaselines.push({ date: baselineDate, tradingsymbol: sym, oi, captured_at: new Date() });
}

async function flushMinuteData() {
  // baselines
  if (pendingBaselines.length) {
    const batch = pendingBaselines.splice(0);
    try {
      await ChainOiBaseline.bulkCreate(batch, { ignoreDuplicates: true });
    } catch (e) {
      logger.error(`[ticker] baseline flush failed: ${e.message}`, e);
    }
  }
  // spreads: one row per contract per minute
  if (spreadAgg.size) {
    const minute = Math.floor(Date.now() / 60000) * 60;
    const rows = [];
    for (const [sym, a] of spreadAgg) {
      const st = [...state.values()].find(x => x.tradingsymbol === sym);
      rows.push({
        minute, tradingsymbol: sym,
        symbol: st?.symbol ?? 'NIFTY', strike: st?.strike ?? null, type: st?.type ?? null,
        ltp: st?.ltp ?? null,
        avg_spread: (a.sum / a.n).toFixed(2), min_spread: a.min.toFixed(2),
        max_spread: a.max.toFixed(2), ticks: a.n
      });
    }
    spreadAgg.clear();
    try {
      await SpreadSample.bulkCreate(rows, { ignoreDuplicates: true });
    } catch (e) {
      logger.error(`[ticker] spread flush failed: ${e.message}`, e);
    }
  }
}

async function chainTokens(symbol, centerSpot) {
  const latestSnap = await NfoInstrument.max('snapshot_date');
  if (!latestSnap) {
    return [];
  }
  const today = new Date().toISOString().slice(0, 10);
  const span = SYMBOLS[symbol].span;
  const rows = await NfoInstrument.findAll({
    where: {
      snapshot_date: latestSnap, name: symbol,
      instrument_type: { [Op.in]: ['CE', 'PE'] },
      expiry: { [Op.gte]: today },
      strike: { [Op.between]: [centerSpot - span, centerSpot + span] }
    },
    order: [['expiry', 'ASC'], ['strike', 'ASC']],
    raw: true
  });
  if (rows.length === 0) {
    return [];
  }
  const nearest = rows[0].expiry;
  return rows.filter(r => r.expiry === nearest).map(r => ({
    symbol, token: Number(r.instrument_token), tradingsymbol: r.tradingsymbol,
    strike: Number(r.strike), type: r.instrument_type, expiry: String(r.expiry)
  }));
}

function onTicks(ticks) {
  const now = Date.now();
  lastAnyTickAt = now;
  for (const t of ticks) {
    const spotSym = SPOT_TOKENS.get(t.instrument_token);
    if (spotSym) {
      // full-mode index ticks carry the day's OHLC — keep it for the desk
      spots[spotSym] = { price: t.last_price, at: now, ohlc: t.ohlc ?? spots[spotSym]?.ohlc ?? null };
      continue;
    }
    const s = state.get(t.instrument_token);
    if (!s) {
      continue;
    }
    s.ltp = t.last_price ?? s.ltp;
    if (t.oi != null) {
      if (s.oiOpen == null) {
        s.oiOpen = t.oi;
      }
      s.oi = t.oi;
      noteBaseline(s.tradingsymbol, t.oi);
    }
    // bid-ask from depth (full mode): the REAL spread, sampled every tick
    const bid = t.depth?.buy?.[0]?.price, ask = t.depth?.sell?.[0]?.price;
    if (bid > 0 && ask > 0 && ask >= bid) {
      s.bid = bid; s.ask = ask;
      const spread = ask - bid;
      let a = spreadAgg.get(s.tradingsymbol);
      if (!a) {
        a = { sum: 0, n: 0, min: spread, max: spread }; spreadAgg.set(s.tradingsymbol, a);
      }
      a.sum += spread; a.n++; a.min = Math.min(a.min, spread); a.max = Math.max(a.max, spread);
    }
    if (t.volume_traded != null) {
      s.volume = t.volume_traded;
    } else if (t.volume != null) {
      s.volume = t.volume;
    }
    if (t.ohlc?.close != null) {
      s.prevClose = t.ohlc.close;
    }
    s.lastTickAt = now;
  }
}

async function subscribeChain() {
  const chains = [];
  for (const sym of Object.keys(SYMBOLS)) {
    const center = spots[sym].price ?? SYMBOLS[sym].defaultSpot;
    chains.push(...await chainTokens(sym, center));
  }
  if (chains.length === 0) {
    lastError = 'no instruments for chains (snapshot missing?)'; return;
  }

  const spotTokens = Object.values(SYMBOLS).map(v => v.spotToken);
  const wanted = new Set([...spotTokens, ...chains.map(c => c.token)]);
  for (const c of chains) {
    if (!state.has(c.token)) {
      state.set(c.token, { ...c, ltp: null, oi: null, oiOpen: null, volume: null, prevClose: null, lastTickAt: 0 });
    }
  }
  // drop strikes that drifted out of the window
  const toUnsub = [...subscribedTokens].filter(t => !wanted.has(t));
  const toSub = [...wanted].filter(t => !subscribedTokens.has(t));
  if (toUnsub.length) {
    try {
      ticker.unsubscribe(toUnsub);
    } catch {} toUnsub.forEach(t => {
      subscribedTokens.delete(t); if (!SPOT_TOKENS.has(t)) {
        state.delete(t);
      }
    });
  }
  if (toSub.length) {
    ticker.subscribe(toSub);
    ticker.setMode(ticker.modeFull, toSub.filter(t => !SPOT_TOKENS.has(t)));
    // Full mode for index tokens too — the LTP-mode index subscription is the
    // one Zerodha has silently dropped twice; full mode rides the same class
    // of subscription the options provably keep.
    const spotSubs = toSub.filter(t => SPOT_TOKENS.has(t));
    if (spotSubs.length) {
      ticker.setMode(ticker.modeFull, spotSubs);
    }
    toSub.forEach(t => subscribedTokens.add(t));
  }
  logger.info(`[ticker] subscriptions: ${subscribedTokens.size - spotTokens.length} contracts across ${Object.keys(SYMBOLS).join('+')}`);
}

function start() {
  stop();
  // Credentials from Company Settings (Company Profile → trading), hot-reloaded.
  const creds = brokerCredentials.getBrokerCreds();
  const api_key = creds.apiKey;
  const access_token = creds.accessToken;
  if (!api_key || !access_token) {
    lastError = 'no Zerodha credentials'; return;
  }

  ticker = new KiteTicker({ api_key, access_token });
  lastStartAt = Date.now();
  // NOTE: this SDK's ticker calls process.exit(1) when retries exhaust — the
  // index.js exit guard blocks that. Large finite retry count; -1 exhausts
  // instantly in this SDK version.
  ticker.autoReconnect(true, 300, 60);
  // KiteTicker has no way to detach handlers, so a replaced instance keeps
  // firing into these callbacks and corrupting shared state (a dead old
  // ticker's 'connect' can set connected=true for the live one). Every
  // handler checks it still belongs to the current instance.
  const self = ticker;
  ticker.on('connect', async () => {
    if (ticker !== self) {
      return;
    }
    connected = true; lastError = null;
    logger.info(`[ticker] ${new Date().toISOString()} websocket connected`);
    try {
      await subscribeChain();
    } catch (e) {
      lastError = e.message;
    }
    // The first subscription centers on default spots (real spot ticks have
    // not arrived yet). Re-center once shortly after, so a market far from
    // the defaults gets its proper ATM window in seconds, not 5 minutes.
    setTimeout(() => {
      if (ticker === self && connected) {
        subscribeChain().catch(e => {
          lastError = e.message;
        });
      }
    }, 15000);
  });
  ticker.on('ticks', (t) => {
    if (ticker === self) {
      onTicks(t);
    }
  });
  ticker.on('disconnect', () => {
    if (ticker !== self) {
      return;
    } connected = false; logger.info(`[ticker] ${new Date().toISOString()} websocket disconnected`);
  });
  ticker.on('error', (e) => {
    if (ticker === self) {
      lastError = e?.message ?? 'websocket error';
    }
  });
  ticker.on('noreconnect', () => {
    if (ticker !== self) {
      return;
    } connected = false; lastError = 'gave up reconnecting (token likely expired)'; logger.info(`[ticker] ${new Date().toISOString()} gave up reconnecting`);
  });
  ticker.connect();

  loadBaselines().catch(e => logger.error(`[ticker] baseline load failed: ${e.message}`, e));
  flushTimer = setInterval(() => {
    flushMinuteData().catch(() => {});
  }, 60 * 1000);

  recenterTimer = setInterval(() => {
    if (connected) {
      subscribeChain().catch(e => {
        lastError = e.message;
      });
    }
  }, RECENTER_MS);

  // Staleness self-heal: judge the feed by tick recency, never by `connected`.
  // Two failure shapes, two cures. Everything silent = dead pipe, rebuild the
  // websocket. Spot silent while options tick = Zerodha quietly dropped just
  // the index subscription (seen twice, Sep 28–29) — re-issuing the index
  // subscribe heals it in seconds without churning the whole chain.
  healthTimer = setInterval(() => {
    const now = Date.now();
    const istDay = new Date(now + 19800 * 1000).getUTCDay();
    if (istDay === 0 || istDay === 6) {
      return;
    }
    if (!isMarketOpen(Math.floor(now / 1000))) {
      return;
    }
    if (now - lastStartAt < STARTUP_GRACE_MS) {
      return;
    }
    const spotFreshest = Math.max(spots.NIFTY.at || 0, spots.BANKNIFTY.at || 0);
    const spotSilentMs = now - spotFreshest;
    const anySilentMs = now - Math.max(lastAnyTickAt, lastStartAt);
    if (anySilentMs > STALE_MS) {
      logger.info(`[ticker] ${new Date().toISOString()} feed silent ${Math.round(anySilentMs / 1000)}s (connected=${connected}) — rebuilding websocket`);
      start();
    } else if (spotSilentMs > STALE_MS) {
      logger.info(`[ticker] ${new Date().toISOString()} spot silent ${Math.round(spotSilentMs / 1000)}s while options tick — resubscribing index tokens`);
      try {
        const spotTokens = Object.values(SYMBOLS).map(v => v.spotToken);
        ticker.unsubscribe(spotTokens);
        ticker.subscribe(spotTokens);
        ticker.setMode(ticker.modeFull, spotTokens);
      } catch (e) {
        lastError = e.message;
      }
    }
  }, 15 * 1000);
}

function stop() {
  if (flushTimer) {
    clearInterval(flushTimer); flushTimer = null;
  }
  if (recenterTimer) {
    clearInterval(recenterTimer); recenterTimer = null;
  }
  if (healthTimer) {
    clearInterval(healthTimer); healthTimer = null;
  }
  if (ticker) {
    try {
      ticker.disconnect();
    } catch {} ticker = null;
  }
  connected = false;
  subscribedTokens = new Set();
}

/** Restart with fresh credentials — called after a successful daily login. */
function restart() {
  logger.info(`[ticker] restarting with fresh token`); start();
}

/** Memory snapshot the UI polls every second — zero Zerodha cost. */
function getChain(symbol = 'NIFTY') {
  if (!SYMBOLS[symbol]) {
    symbol = 'NIFTY';
  }
  const byStrike = new Map();
  let expiry = null;
  for (const s of state.values()) {
    if (s.symbol !== symbol) {
      continue;
    }
    expiry = expiry ?? s.expiry;
    let row = byStrike.get(s.strike);
    if (!row) {
      row = { strike: s.strike }; byStrike.set(s.strike, row);
    }
    const base = oiBaselines.get(s.tradingsymbol) ?? s.oiOpen;
    row[s.type] = {
      tradingsymbol: s.tradingsymbol,
      ltp: s.ltp,
      changePct: (s.ltp != null && s.prevClose > 0) ? Number(((s.ltp - s.prevClose) / s.prevClose * 100).toFixed(1)) : null,
      oi: s.oi,
      oiChangeToday: (s.oi != null && base != null) ? s.oi - base : null,
      volume: s.volume,
      bid: s.bid ?? null, ask: s.ask ?? null,
      spread: (s.bid > 0 && s.ask > 0) ? Number((s.ask - s.bid).toFixed(2)) : null,
      ageMs: s.lastTickAt ? Date.now() - s.lastTickAt : null
    };
  }
  const rows = [...byStrike.values()].sort((a, b) => a.strike - b.strike);
  // OI walls: biggest OI on each side
  // S/R = biggest OI walls within ±500 of spot — the SAME near-window rule
  // Method 2's Key Levels use, so the two screens can never disagree. Far
  // round-number mega-strikes (e.g. 22000) still show their OI in the rows;
  // they are the battlefield's floor, not today's trading wall.
  const sp = spots[symbol];
  const nearSpot = sp.price ?? null;
  const NEAR = 500;
  let maxPeOi = 0, maxCeOi = 0, support = null, resistance = null;
  for (const r of rows) {
    if (nearSpot != null && Math.abs(r.strike - nearSpot) > NEAR) {
      continue;
    }
    if (r.PE?.oi > maxPeOi) {
      maxPeOi = r.PE.oi; support = r.strike;
    }
    if (r.CE?.oi > maxCeOi) {
      maxCeOi = r.CE.oi; resistance = r.strike;
    }
  }
  return {
    symbol, connected, lastError,
    spot: sp.price, spotAgeMs: sp.at ? Date.now() - sp.at : null,
    dayOhlc: sp.ohlc ?? null,
    expiry, support, resistance,
    contracts: rows.length * 2, rows
  };
}

module.exports = { start, stop, restart, getChain };
