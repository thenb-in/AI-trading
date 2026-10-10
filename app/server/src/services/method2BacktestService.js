'use strict';

/**
 * Method 2 — one-year backtest of the PRICE-CORE, honestly scoped.
 *
 * Real option-chain history (per-minute OI, premiums) begins 2026-08-31; the
 * chain factors (±40 pts) and chain-derived exits CANNOT be reconstructed
 * further back. So this engine
 *   - scores exactly the price factors the live system scores (EMA ±20,
 *     MACD ±15, RSI ±10, SuperTrend ±5, ADX bonus ±5), chain factors held
 *     at 0 = "unavailable", same 65% gate on the same 0–100 mapping
 *   - trades the ATM option with Black-Scholes-modelled premiums (historical
 *     vol), the live system's ATR-fallback exits, and the FULL lifecycle
 *     rulebook: one trade at a time, trailing stop after T1/T2, opposite-side
 *     invalidation at gate conviction, 15:20 force-close, entries until 15:15
 *   - charges 130 qty (2 lots), full Zerodha costs and 0.25 pts/side slippage
 *
 * What this answers: did the price side of Method 2 carry a tradable edge
 * over the year, after all friction? What it cannot answer: how the chain
 * factors would have voted before Aug-31 — that history is purged forever.
 */

const { getIndexCandles } = require('./candleStoreService');
const { estimateCosts } = require('./scalpService');
const { ScalpReport } = require('../models');
const { IST, istMinutes, isMarketOpen, bsPrice, dteYears, atmStrike, optSymbol } = require('../utils/optionMath');

const QTY = 130, LOTS = 2;
/**
 * Slippage per side. 0.13 is the MEASURED median from spread_samples
 * (half the median bid-ask on the strikes we trade); 0.25 — the old blanket
 * assumption — turns out to equal the measured p90 stress case. Runs default
 * to measured; sensitivity runs pass their own.
 */
const DEFAULT_SLIP = 0.13;
/**
 * The manual configuration the system has been running. Walk-forward search
 * varies these; everything else (lifecycle rules, costs, exits) stays fixed —
 * the rules are the system, the weights are the hypothesis under test.
 */
const DEFAULT_PARAMS = { gate: 65, wEma: 20, wMacd: 15, wRsi: 10, wSt: 5, wAdx: 5 };
/**
 * The configuration LIVE Method 2 actually trades (adopted 2026-09-25 from
 * walk-forward validation). The year backtest defaults to this so the
 * /backtest page always answers "what would MY system have done" — while
 * DEFAULT_PARAMS stays frozen as the historical manual baseline that
 * walk-forward runs compare against.
 */
const LIVE_PARAMS = { gate: 70, wEma: 15, wMacd: 10, wRsi: 10, wSt: 5, wAdx: 5 };
const CHAIN_MAX = 50;   // chain factors' weight: OI 25 + PCR 15 + OI-S/R 10 (zero-fed pre-2026-08-31)
const EXIT_CUTOFF_MIN = 15 * 60 + 20, LAST_ENTRY_MIN = 15 * 60 + 15;

// ── O(n) indicator series ──────────────────────────────────────────────────

function emaAll(closes, period) {
  const out = new Array(closes.length).fill(null);
  if (closes.length < period) return out;
  let sum = 0;
  for (let i = 0; i < period; i++) sum += closes[i];
  out[period - 1] = sum / period;
  const k = 2 / (period + 1);
  for (let i = period; i < closes.length; i++) out[i] = closes[i] * k + out[i - 1] * (1 - k);
  return out;
}

function rsiAll(closes, period = 14) {
  const out = new Array(closes.length).fill(null);
  if (closes.length < period + 1) return out;
  let g = 0, l = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d > 0) g += d; else l -= d;
  }
  g /= period; l /= period;
  out[period] = l === 0 ? 100 : 100 - 100 / (1 + g / l);
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    g = (g * (period - 1) + Math.max(d, 0)) / period;
    l = (l * (period - 1) + Math.max(-d, 0)) / period;
    out[i] = l === 0 ? 100 : 100 - 100 / (1 + g / l);
  }
  return out;
}

function macdAll(closes) {
  const e12 = emaAll(closes, 12), e26 = emaAll(closes, 26);
  const macd = closes.map((_, i) => (e12[i] != null && e26[i] != null) ? e12[i] - e26[i] : null);
  // signal: EMA9 of macd (seeded at first 9 valid values)
  const sig = new Array(closes.length).fill(null);
  let seed = [], k = 2 / 10;
  for (let i = 0; i < closes.length; i++) {
    if (macd[i] == null) continue;
    if (sig[i - 1] == null) {
      seed.push(macd[i]);
      if (seed.length === 9) sig[i] = seed.reduce((a, b) => a + b, 0) / 9;
    } else sig[i] = macd[i] * k + sig[i - 1] * (1 - k);
  }
  return closes.map((_, i) => {
    if (macd[i] == null || sig[i] == null || sig[i - 1] == null || macd[i - 1] == null) return null;
    const hist = macd[i] - sig[i], histPrev = macd[i - 1] - sig[i - 1];
    return {
      macd: macd[i],
      crossover: histPrev <= 0 && hist > 0 ? 'bullish' : histPrev >= 0 && hist < 0 ? 'bearish' : null,
      histDir: hist > histPrev ? 'rising' : hist < histPrev ? 'falling' : null,
    };
  });
}

function adxAll(candles, period = 14) {
  const n = candles.length;
  const out = new Array(n).fill(null);
  if (n < period * 2) return out;
  let trS = 0, pdmS = 0, ndmS = 0;
  const dx = [];
  let prevAdx = null;
  for (let i = 1; i < n; i++) {
    const c = candles[i], p = candles[i - 1];
    const tr = Math.max(c.high - c.low, Math.abs(c.high - p.close), Math.abs(c.low - p.close));
    const up = c.high - p.high, dn = p.low - c.low;
    const pdm = up > dn && up > 0 ? up : 0;
    const ndm = dn > up && dn > 0 ? dn : 0;
    if (i <= period) { trS += tr; pdmS += pdm; ndmS += ndm; if (i < period) continue; }
    else { trS = trS - trS / period + tr; pdmS = pdmS - pdmS / period + pdm; ndmS = ndmS - ndmS / period + ndm; }
    const pdi = trS > 0 ? 100 * pdmS / trS : 0, ndi = trS > 0 ? 100 * ndmS / trS : 0;
    const d = (pdi + ndi) > 0 ? 100 * Math.abs(pdi - ndi) / (pdi + ndi) : 0;
    if (prevAdx == null) {
      dx.push(d);
      if (dx.length === period) { prevAdx = dx.reduce((a, b) => a + b, 0) / period; out[i] = prevAdx; }
    } else { prevAdx = (prevAdx * (period - 1) + d) / period; out[i] = prevAdx; }
  }
  return out;
}

function supertrendAll(candles, period = 10, mult = 3) {
  const n = candles.length;
  const out = new Array(n).fill(null);
  if (n < period + 2) return out;
  let atr = 0;
  for (let i = 1; i <= period; i++) {
    const c = candles[i], p = candles[i - 1];
    atr += Math.max(c.high - c.low, Math.abs(c.high - p.close), Math.abs(c.low - p.close));
  }
  atr /= period;
  let ub = null, lb = null, dir = 1;
  for (let i = period + 1; i < n; i++) {
    const c = candles[i], p = candles[i - 1];
    const tr = Math.max(c.high - c.low, Math.abs(c.high - p.close), Math.abs(c.low - p.close));
    atr = (atr * (period - 1) + tr) / period;
    const mid = (c.high + c.low) / 2;
    let bub = mid + mult * atr, blb = mid - mult * atr;
    if (ub != null) bub = (bub < ub || p.close > ub) ? bub : ub;
    if (lb != null) blb = (blb > lb || p.close < lb) ? blb : lb;
    if (ub != null && c.close > ub) dir = 1;
    else if (lb != null && c.close < lb) dir = -1;
    ub = bub; lb = blb;
    out[i] = dir;
  }
  return out;
}

// rolling 20-day annualised vol from daily closes
function volSeries(candles) {
  const daily = [];
  let lastDay = null;
  for (let i = 0; i < candles.length; i++) {
    const m = istMinutes(candles[i].time);
    const day = Math.floor((candles[i].time + IST) / 86400);
    if (m >= 895 && day !== lastDay) { daily.push({ idx: i, close: candles[i].close }); lastDay = day; }
  }
  return (idx) => {
    let d = daily.length - 1;
    while (d >= 0 && daily[d].idx > idx) d--;
    const s = daily.slice(Math.max(0, d - 20), d + 1);
    if (s.length < 3) return 0.15;
    const r = [];
    for (let j = 1; j < s.length; j++) r.push(Math.log(s[j].close / s[j - 1].close));
    const mean = r.reduce((a, b) => a + b, 0) / r.length;
    const v = r.reduce((a, b) => a + (b - mean) ** 2, 0) / r.length;
    return Math.max(0.10, Math.min(0.60, Math.sqrt(v * 252)));
  };
}

// ── the engine ─────────────────────────────────────────────────────────────

function precompute(candles) {
  const closes = candles.map(c => c.close);
  const e20 = emaAll(closes, 20), e50 = emaAll(closes, 50), rsi = rsiAll(closes, 14);
  const macd = macdAll(closes), adx = adxAll(candles, 14), st = supertrendAll(candles, 10, 3);

  // Per-candle factor STATES (weight multipliers in [-1, 1]) computed once,
  // so a parameter grid costs five multiplies per candle instead of the full
  // indicator logic. Bit-for-bit equivalent to the explicit scorer.
  const n = candles.length;
  const emaS = new Float64Array(n), macdS = new Float64Array(n),
        rsiS = new Float64Array(n), stS = new Float64Array(n), adxHot = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const price = closes[i];
    if (e20[i] != null && e50[i] != null) {
      if (price > e20[i] && e20[i] > e50[i]) emaS[i] = 1;
      else if (price < e20[i] && e20[i] < e50[i]) emaS[i] = -1;
      else if (price > e20[i]) emaS[i] = 0.5;
      else if (price < e20[i]) emaS[i] = -0.5;
    }
    const m = macd[i];
    if (m) {
      if (m.crossover === 'bullish') macdS[i] = 1;
      else if (m.crossover === 'bearish') macdS[i] = -1;
      else if (m.histDir === 'rising') macdS[i] = m.macd > 0 ? 2 / 3 : 1 / 3;
      else if (m.histDir === 'falling') macdS[i] = m.macd < 0 ? -2 / 3 : -1 / 3;
    }
    const r = rsi[i];
    if (r != null) { if (r > 65) rsiS[i] = 1; else if (r > 55) rsiS[i] = 0.5; else if (r < 35) rsiS[i] = -1; else if (r < 45) rsiS[i] = -0.5; }
    if (st[i] === 1) stS[i] = 1; else if (st[i] === -1) stS[i] = -1;
    if (adx[i] != null && adx[i] >= 28) adxHot[i] = 1;
  }
  return { candles, closes, macd, adx, emaS, macdS, rsiS, stS, adxHot, volAt: volSeries(candles) };
}

function monthArr(candles) {
  const out = new Int8Array(candles.length);
  let curDay = -1, curMonth = 0;
  for (let i = 0; i < candles.length; i++) {
    const day = Math.floor((candles[i].time + IST) / 86400);
    if (day !== curDay) { curDay = day; curMonth = new Date((candles[i].time + IST) * 1000).getUTCMonth() + 1; }
    out[i] = curMonth;
  }
  return out;
}

function makeScorer(pre, params) {
  const { emaS, macdS, rsiS, stS, adxHot, macd, adx } = pre;
  const maxTotal = CHAIN_MAX + params.wEma + params.wMacd + params.wRsi + params.wSt + params.wAdx;
  // Seasonal back-of-mind tilt: params.seasonal maps month -> +1/-1 for the
  // months that cleared the >=70%-of-years bar; wSeason points nudge the raw
  // score (NOT maxTotal — it is a tilt on conviction, not a scored factor).
  // wSeason 2 on the +/-95 scale shifts bullPct by ~1% — deliberately tiny.
  const seasonal = params.seasonal, wSeason = params.wSeason ?? 0;
  const months = seasonal && wSeason ? monthArr(pre.candles) : null;
  return (i) => {
    let s = emaS[i] * params.wEma + macdS[i] * params.wMacd + rsiS[i] * params.wRsi + stS[i] * params.wSt;
    if (adxHot[i]) s += s >= 0 ? params.wAdx : -params.wAdx;
    if (months) s += (seasonal[months[i]] ?? 0) * wSeason;
    // Method-3 bonus variant: an aligned external trigger (breakout ±1) leans
    // the score by wSignal points instead of hard-gating the entry
    if (params.signalNudgeAt && params.wSignal) s += params.signalNudgeAt(i) * params.wSignal;
    const bullPct = Math.round(Math.min(100, Math.max(0, (s + maxTotal) / (2 * maxTotal) * 100)));
    return { bullPct, bearPct: 100 - bullPct, macd: macd[i], adx: adx[i] };
  };
}

/**
 * Simulates [iFrom, iTo) with the given params. Same lifecycle as always.
 */
function simulateRange(pre, params, iFrom, iTo) {
  const { candles } = pre;
  const GATE = params.gate;
  const slip = params.slip ?? DEFAULT_SLIP;
  const volAt = pre.volAt;
  /**
   * Premium at spot S, time t for the active contract. 'project' pricing is the
   * historical convention (realised vol, next-week roll on expiry day).
   * 'calibrated' applies the IV/realised multipliers measured on the real
   * Sep/Oct-2026 chain (see YOUTUBE_TECHNIQUES_BACKTEST.md §2) and prices the
   * CURRENT weekly expiry (Thursday until Aug-2025, Tuesday after), with the
   * measured intraday drift — it removes the ~₹500/trade optimism of the
   * project model, almost all of it on expiry day.
   */
  const premiumAt = (typ, S, K, t, vol, entryDow, entryDay) => {
    if (params.pricing !== 'calibrated') return bsPrice(typ, S, K, dteYears(t, entryDow), vol);
    const expDow = entryDay * 86400 >= 1756684800 ? 2 : 4;
    const dow = (entryDay + 4) % 7, d = (expDow - dow + 7) % 7;
    const secs = (t + IST) % 86400;
    const T = Math.max(d + (15.5 * 3600 - secs) / 86400, 1e-5) / 365, dte = T * 365;
    const frac = Math.max(0, Math.min(1, (istMinutes(t) - 555) / 375));
    let m;
    if (dte < 0.5) m = 2.5 * (1 + 0.25 * frac);
    else if (dte < 1.5) m = 1.75 * (1 + 0.05 * frac);
    else if (dte < 3.5) m = 1.3;
    else if (dte < 7.5) m = 1.05 * (1 - 0.06 * frac);
    else m = 1.16 * (1 - 0.06 * frac);
    return bsPrice(typ, S, K, T, Math.max(vol, 0.08) * m);
  };
  const atrAt = (i) => {
    let s = 0, n = 0;
    for (let j = Math.max(1, i - 69); j <= i; j++) { s += candles[j].high - candles[j].low; n++; }
    return n ? (s / n) * 5 : null;
  };
  const scoreAt = makeScorer(pre, params);

  // Optional entry-discipline knobs (defaults = historical behavior), so
  // loss-pattern hypotheses run as true simulations, not post-hoc filters:
  const entryFromMin = params.entryFromMin ?? 9 * 60 + 15;  // e.g. 9*60+30 skips the open
  const lastEntryMin = params.lastEntryMin ?? LAST_ENTRY_MIN;
  const invGate = params.invGate ?? GATE;                   // opposite-side conviction that force-closes
  const cooldownMin = params.cooldownMin ?? 0;              // wait after an exit before re-entering
  // Expiry-day discipline (data-derived, see YOUTUBE_TECHNIQUES_BACKTEST.md §5): on the
  // weekly expiry day the expiring ATM decays to near-intrinsic by the close, so a
  // long option held to 15:20 bleeds. Optional earlier force-close + entry cutoff.
  const expiryExitMin = params.expiryExitMin ?? null;        // e.g. 13*60+30
  const expiryLastEntryMin = params.expiryLastEntryMin ?? null;
  const isExpiryDay = (unix) => {
    const day = Math.floor((unix + IST) / 86400), dow = (day + 4) % 7;
    return dow === (day * 86400 >= 1756684800 ? 2 : 4);
  };
  const maxTradesDay = params.maxTradesDay ?? Infinity;
  let lastExitT = 0, dayKey = '', dayCount = 0;

  const trades = [];
  let active = null;
  let i = Math.max(100, iFrom);
  while (i < Math.min(iTo, candles.length - 2)) {
    const c = candles[i], t = c.time, min = istMinutes(t);
    if (!isMarketOpen(t)) { i++; continue; }
    const sc = scoreAt(i);

    // ── manage the active trade on THIS candle (its high/low resolve exits) ──
    if (active) {
      const pHigh = premiumAt(active.optType, c.high, active.K, t, active.vol, active.entryDow, active.entryDay);
      const pLow = premiumAt(active.optType, c.low, active.K, t, active.vol, active.entryDow, active.entryDay);
      const premMax = Math.max(pHigh, pLow), premMin = Math.min(pHigh, pLow);
      const pClose = premiumAt(active.optType, c.close, active.K, t, active.vol, active.entryDow, active.entryDay);
      active.maxPrem = Math.max(active.maxPrem, premMax);
      // targets ratchet the stop; T1's ratchet banks entry + costs (₹1.05/unit
      // at 2 lots), mirroring the live 1R breakeven rule adopted Sep 29
      if (active.targetsHit < 1 && active.maxPrem >= active.t1) { active.targetsHit = 1; active.trailSl = Math.max(active.trailSl, active.entry + 1.05); }
      if (active.targetsHit < 2 && active.maxPrem >= active.t2) { active.targetsHit = 2; active.trailSl = Math.max(active.trailSl, active.t1); }
      // profit trail (chandelier by 1R): once 1R in favour, the stop follows
      // the high-water mark one R behind — profit gets trailed continuously,
      // not only at target lines
      if (params.profitTrail) {
        const oneR = active.entry - active.sl;
        const dist = oneR * (params.trailR ?? 1);          // how far behind the high-water mark
        const armed = params.trailAfterT2 ? active.targetsHit >= 2
                                          : active.maxPrem >= active.entry + oneR;
        if (oneR > 0 && armed) {
          active.trailSl = Math.max(active.trailSl, active.entry + 1.05, active.maxPrem - dist);
        }
      }

      let outcome = null, exitPrem = null;
      if (params.exitMode === 'simple') {
        if (premMin <= active.sl) { outcome = 'stopped'; exitPrem = active.sl; }
        else if (active.maxPrem >= active.t1) { outcome = 'target'; exitPrem = active.t1; }
        else if (params.useInvalidation && (active.dir === 'BUY' ? sc.bearPct : sc.bullPct) >= invGate) { outcome = 'invalidated'; exitPrem = pClose; }
        else if (min >= EXIT_CUTOFF_MIN) { outcome = 'eod'; exitPrem = pClose; }
      } else if (premMin <= active.trailSl) { outcome = active.targetsHit > 0 ? 'trail-stop' : 'stopped'; exitPrem = active.trailSl; }
      else if (active.targetsHit < 3 && active.maxPrem >= active.t3) { outcome = 'target'; exitPrem = active.t3; }
      else {
        const oppConv = active.dir === 'BUY' ? sc.bearPct : sc.bullPct;
        if (oppConv >= invGate) { outcome = 'invalidated'; exitPrem = pClose; }
        else if (min >= EXIT_CUTOFF_MIN) { outcome = 'eod'; exitPrem = pClose; }
        else if (expiryExitMin && min >= expiryExitMin && isExpiryDay(t)) { outcome = 'expiry-exit'; exitPrem = pClose; }
      }
      if (outcome) {
        const exitFill = exitPrem - slip;
        const grossReal = (exitFill - active.entry) * QTY;
        const charges = estimateCosts(active.entry, exitFill, QTY);
        trades.push({
          date: new Date((active.entryTime + IST) * 1000).toISOString().slice(0, 10),
          time: new Date((active.entryTime + IST) * 1000).toISOString().slice(11, 16),
          dir: active.dir, sym: active.sym, conf: active.conf,
          entry: +active.entry.toFixed(2), sl: +active.sl.toFixed(2),
          t1: +active.t1.toFixed(2), t2: +active.t2.toFixed(2), t3: +active.t3.toFixed(2),
          exit: +exitFill.toFixed(2), outcome, targetsHit: active.targetsHit,
          heldMins: Math.round((t - active.entryTime) / 60),
          grossRs: Math.round((exitPrem - (active.entry - slip)) * QTY),
          slippageRs: Math.round(slip * 2 * QTY),
          chargesRs: Math.round(charges),
          netRs: Math.round(grossReal - charges),
        });
        if (!params.cooldownLossOnly || (grossReal - charges) <= 0) lastExitT = t;
        active = null;
      }
    }

    // ── entries ──────────────────────────────────────────────────────────
    const dk = new Date((t + IST) * 1000).toISOString().slice(0, 10);
    if (dk !== dayKey) { dayKey = dk; dayCount = 0; }
    if (!active && min < lastEntryMin && min >= entryFromMin
        && !(expiryLastEntryMin && isExpiryDay(t) && min >= expiryLastEntryMin)
        && (t - lastExitT) >= cooldownMin * 60 && dayCount < maxTradesDay) {
      let dir = sc.bullPct >= GATE ? 'BUY' : sc.bearPct >= GATE ? 'SELL' : null;
      // Method-3 hook: an external trigger (e.g. a swing-S/R breakout) must
      // agree with the scored direction, or there is no entry this candle.
      if (dir && params.entrySignalAt) {
        const sig = params.entrySignalAt(i);           // +1 bull / -1 bear / 0 none
        if (!(sig === 1 && dir === 'BUY') && !(sig === -1 && dir === 'SELL')) dir = null;
      }
      if (dir && sc.macd) {
        if (dir === 'BUY' && sc.macd.crossover === 'bearish') dir = null;   // contradiction veto
        if (dir === 'SELL' && sc.macd.crossover === 'bullish') dir = null;
      }
      if (dir && sc.adx != null && sc.adx < (params.adxMin ?? 20)) dir = null;   // chop gate (default 20)
      if (dir) {
        const ec = candles[i + 1];
        if (ec && ec.time === t + 60) {
          const optType = dir === 'BUY' ? 'CE' : 'PE';
          const entryDow = new Date((t + IST) * 1000).getUTCDay();
          const vol = volAt(i);
          const K = atmStrike(ec.open);
          const entryDay = Math.floor((ec.time + IST) / 86400);
          const raw = premiumAt(optType, ec.open, K, ec.time, vol, entryDow, entryDay);
          const entry = raw + slip;
          const atr = atrAt(i) ?? 12;
          let sl, t1, t2, t3;
          if (params.exitMode === 'simple') {
            // Win-rate-targeting geometry: ONE quick target (tMult x the ATR
            // premium move), one wide stop (sMult x), full exit at either.
            // Exists to measure what a chosen win rate COSTS — win rate is a
            // design parameter, not an achievement.
            const move = atr * 0.5;                        // ~ATM delta
            t1 = entry + move * (params.tMult ?? 0.4);
            sl = Math.max(entry * 0.2, entry - move * (params.sMult ?? 3));
            t2 = t1; t3 = t1;                              // single target
          } else {
            sl = Math.max(entry * 0.50, Math.min(entry * 0.70, entry - atr * 0.5 * 1.5));
            const risk = entry - sl;
            t1 = entry + risk; t2 = entry + risk * 1.8; t3 = entry + risk * 2.5;
          }
          active = {
            dir, optType, K, vol, entryDow, entryDay,
            sym: optSymbol(K, optType, ec.time),
            entryTime: ec.time, entry, sl, trailSl: sl,
            t1, t2, t3,
            targetsHit: 0, maxPrem: entry, conf: Math.max(sc.bullPct, sc.bearPct),
          };
          dayCount++;
          i++;   // consumed the entry candle
        }
      }
    }
    i++;
  }
  return trades;
}

function summarize(trades) {
  const wins = trades.filter(t => t.netRs > 0), losses = trades.filter(t => t.netRs <= 0);
  const gw = wins.reduce((a, t) => a + t.netRs, 0), gl = Math.abs(losses.reduce((a, t) => a + t.netRs, 0));
  let eq = 0, peak = 0, dd = 0;
  for (const t of trades) { eq += t.netRs; peak = Math.max(peak, eq); dd = Math.max(dd, peak - eq); }
  return {
    trades: trades.length, wins: wins.length,
    winRate: trades.length ? +(wins.length / trades.length * 100).toFixed(1) : 0,
    netRs: trades.reduce((a, t) => a + t.netRs, 0),
    grossRs: trades.reduce((a, t) => a + t.grossRs, 0),
    chargesRs: trades.reduce((a, t) => a + t.chargesRs, 0),
    slippageRs: trades.reduce((a, t) => a + t.slippageRs, 0),
    profitFactor: gl > 0 ? +(gw / gl).toFixed(2) : null,
    maxDrawdownRs: dd,
    avgWinRs: wins.length ? Math.round(gw / wins.length) : 0,
    avgLossRs: losses.length ? Math.round(gl / losses.length) : 0,
  };
}

/**
 * Method 2 + discipline: the live configuration plus the rules the Oct-2026
 * technique study showed to help on the test year AND the three years before
 * it (scripts/m2_improve.js). Filled from the sweep; see YOUTUBE_TECHNIQUES_BACKTEST.md §9.
 */
const PLUS_PARAMS = { ...LIVE_PARAMS, profitTrail: true, trailR: 1.5,
  adxMin: 30 };   // the only rule in the sweep that lifts the year (+₹62k) and holds on 2022-25 (−1.7%)

async function runYearBacktest({ from = '2025-09-24', to = '2026-09-25', params, kind = 'm2-year', labelPrefix = 'Method 2 price-core' } = {}) {
  // default to what live actually trades: LIVE_PARAMS weights + the Sep-29
  // exit discipline (1R breakeven ratchet + 1.5R profit trail)
  params = params ?? { ...LIVE_PARAMS, profitTrail: true, trailR: 1.5 };
  const fromUnix = Math.floor(new Date(`${from}T00:00:00+05:30`).getTime() / 1000);
  const toUnix = Math.floor(new Date(`${to}T23:59:59+05:30`).getTime() / 1000);
  const candles = await getIndexCandles('NIFTY', fromUnix, toUnix);
  if (candles.length < 5000) throw new Error(`Only ${candles.length} 1-min candles in range — backfill first`);
  const pre = precompute(candles);
  const trades = simulateRange(pre, params, 100, candles.length);

  // ── summarise ────────────────────────────────────────────────────────────
  const wins = trades.filter(t => t.netRs > 0), losses = trades.filter(t => t.netRs <= 0);
  const gw = wins.reduce((a, t) => a + t.netRs, 0), gl = Math.abs(losses.reduce((a, t) => a + t.netRs, 0));
  let eq = 0, peak = 0, dd = 0;
  for (const t of trades) { eq += t.netRs; peak = Math.max(peak, eq); dd = Math.max(dd, peak - eq); }
  const monthly = {};
  for (const t of trades) {
    const m = t.date.slice(0, 7);
    (monthly[m] ??= { month: m, trades: 0, wins: 0, netRs: 0 });
    monthly[m].trades++; if (t.netRs > 0) monthly[m].wins++; monthly[m].netRs += t.netRs;
  }
  const byOutcome = {};
  for (const t of trades) byOutcome[t.outcome] = (byOutcome[t.outcome] ?? 0) + 1;
  const avgW = wins.length ? gw / wins.length : 0, avgL = losses.length ? gl / losses.length : 0;

  const report = {
    kind,
    label: `${labelPrefix} ${from} → ${to} (g${params.gate}/e${params.wEma}/m${params.wMacd}/r${params.wRsi}, slip ${params.slip ?? DEFAULT_SLIP})`.slice(0, 80),
    params: {
      from, to, qty: QTY, lots: LOTS, gate: params.gate, weights: params,
      slippagePts: params.slip ?? DEFAULT_SLIP,
      scope: 'price factors only (chain factors start 2026-08-31 — earlier chain history is purged by Zerodha)',
      premiums: 'Black-Scholes from 1-min spot with 20-day historical vol',
      exits: 'live exit rules (Sep 29): targets capped ≤1.5×/2×/2.25× entry, 1R breakeven ratchet, 1.5R profit trail, trailing after T1/T2, opposite-side invalidation, EOD 15:20',
      candles: candles.length,
    },
    summary: {
      trades: trades.length, wins: wins.length, losses: losses.length,
      winRate: trades.length ? +(wins.length / trades.length * 100).toFixed(1) : 0,
      requiredWinRate: (avgW > 0 && avgL > 0) ? +(avgL / (avgL + avgW) * 100).toFixed(1) : null,
      grossRs: trades.reduce((a, t) => a + t.grossRs, 0),
      chargesRs: trades.reduce((a, t) => a + t.chargesRs, 0),
      slippageRs: trades.reduce((a, t) => a + t.slippageRs, 0),
      netRs: trades.reduce((a, t) => a + t.netRs, 0),
      avgWinRs: Math.round(avgW), avgLossRs: Math.round(avgL),
      profitFactor: gl > 0 ? +(gw / gl).toFixed(2) : null,
      maxDrawdownRs: dd,
      byOutcome,
      avgHoldMins: trades.length ? +(trades.reduce((a, t) => a + t.heldMins, 0) / trades.length).toFixed(0) : 0,
      profitable: gw > gl,
    },
    byDay: Object.values(monthly),      // month rows reuse the byDay column
    trades: trades.slice(-2000),
  };
  const row = await ScalpReport.create({
    kind: report.kind, label: report.label, params: report.params,
    summary: report.summary, by_day: report.byDay, trades: report.trades,
  });
  return { id: row.id, ...report };
}

async function latestYearReport(kind = 'm2-year') {
  return ScalpReport.findOne({ where: { kind }, order: [['created_at', 'DESC']] });
}

/** Method 2 + discipline — same engine, PLUS_PARAMS, its own report kind. */
async function runPlusBacktest({ from, to } = {}) {
  return runYearBacktest({ from, to, params: { ...PLUS_PARAMS }, kind: 'm2-plus-year', labelPrefix: 'Method 2 + discipline' });
}
async function latestPlusReport() { return latestYearReport('m2-plus-year'); }

/**
 * Method 3 — "prime" — year backtest: Method 1's swing-S/R breakout as the
 * entry trigger, Method 2's conviction gate as the filter, Method 2's full
 * exit stack as management, on options with full costs. Fewer, higher-grade
 * trades (measured 4y: PF 1.40, 50.9% win, −28% drawdown vs Method 2 alone).
 */
async function runMethod3Backtest({ from = '2025-09-24', to = '2026-09-25' } = {}) {
  const { buildBreakoutSignal } = require('./market_data');
  const fromUnix = Math.floor(new Date(`${from}T00:00:00+05:30`).getTime() / 1000);
  const toUnix = Math.floor(new Date(`${to}T23:59:59+05:30`).getTime() / 1000);
  const candles = await getIndexCandles('NIFTY', fromUnix, toUnix);
  if (candles.length < 5000) throw new Error(`Only ${candles.length} 1-min candles in range — backfill first`);
  const sig = buildBreakoutSignal(candles);
  const params = { ...LIVE_PARAMS, profitTrail: true, trailR: 1.5, entrySignalAt: (i) => sig[i] };
  const pre = precompute(candles);
  const trades = simulateRange(pre, params, 100, candles.length);
  const summary = summarize(trades);
  summary.requiredWinRate = (summary.avgWinRs + summary.avgLossRs) > 0
    ? +((summary.avgLossRs / (summary.avgLossRs + summary.avgWinRs)) * 100).toFixed(1) : null;
  summary.byOutcome = {};
  const monthly = {};
  for (const t of trades) {
    summary.byOutcome[t.outcome] = (summary.byOutcome[t.outcome] ?? 0) + 1;
    const m = t.date.slice(0, 7);
    (monthly[m] ??= { month: m, trades: 0, wins: 0, netRs: 0 });
    monthly[m].trades++; if (t.netRs > 0) monthly[m].wins++; monthly[m].netRs += t.netRs;
  }
  summary.monthly = Object.values(monthly).sort((a, b) => a.month.localeCompare(b.month));
  summary.profitable = summary.netRs > 0;
  const report = {
    kind: 'm3-year',
    label: `Method 3 prime (breakout × conviction) ${from} → ${to} (g${params.gate}, slip ${params.slip ?? DEFAULT_SLIP})`,
    params: {
      from, to, qty: QTY, lots: LOTS, gate: params.gate, weights: { ...LIVE_PARAMS },
      slippagePts: params.slip ?? DEFAULT_SLIP,
      entry: 'Method 2 conviction ≥ gate AND a swing-S/R breakout (5-min, 100-bar window) fired the same way within 5 minutes',
      exits: 'live exit rules: targets capped ≤1.5×/2×/2.25× entry, 1R breakeven ratchet, 1.5R profit trail, trailing after T1/T2, invalidation, EOD 15:20',
    },
    summary, trades,
  };
  const row = await ScalpReport.create({ kind: report.kind, label: report.label, params: report.params, summary, trades });
  return { id: row.id, ...report };
}

async function latestM3Report() {
  return ScalpReport.findOne({ where: { kind: 'm3-year' }, order: [['created_at', 'DESC']] });
}

function tradesToCsv(trades) {
  const cols = ['date', 'time', 'dir', 'sym', 'conf', 'entry', 'sl', 't1', 't2', 't3', 'exit', 'outcome', 'targetsHit', 'heldMins', 'grossRs', 'slippageRs', 'chargesRs', 'netRs'];
  const head = cols.join(',');
  const rows = (trades ?? []).map(t => cols.map(c => t[c] ?? '').join(','));
  return [head, ...rows].join('\r\n');
}

module.exports = {
  runYearBacktest, latestYearReport, runMethod3Backtest, latestM3Report, tradesToCsv,
  runPlusBacktest, latestPlusReport, PLUS_PARAMS,
  precompute, simulateRange, summarize, DEFAULT_PARAMS, LIVE_PARAMS,
};
