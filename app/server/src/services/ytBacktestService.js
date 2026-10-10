'use strict';

/**
 * "YT" year backtest — OUR good points × THEIR good points.
 *
 * THEIRS (the consensus of 29 Indian F&O YouTube videos, >20k likes each —
 * see YOUTUBE_TECHNIQUES_BACKTEST.md) as the ENTRY TRIGGER on 5-min bars:
 *   1. Opening range (09:15–09:30): a bar must CLOSE outside it, then the NEXT
 *      bar must take out the break bar's extreme (never enter on the break
 *      bar) — Pushkar / Neeraj / Shivam.
 *   2. Previous-day high/low from candle BODIES: a bar closes beyond, the next
 *      bar confirms in the same direction — Booming Bulls.
 *   3. Gap-up/gap-down indecision fade: first bar body ≤ 30% of its range,
 *      a later bar (before 11:00) closes through its low/high, ≥ 30 pts of gap
 *      left — Fearless Trader Shivam / Booming Bulls.
 *   Every trigger bar must pass the wick filter (buy bar: upper wick ≤ 25% of
 *   range; sell bar: lower wick ≤ 25%) and the trend check (EMA9 > EMA15 and
 *   close above the session VWAP proxy for longs; mirror for shorts) — The
 *   Trade Room / Abhishek Kar / Pushkar. Entries 09:30–14:00, max 2 a day.
 *
 * OURS as the FILTER and the MANAGEMENT, unchanged from the live system:
 *   Method 2 conviction ≥ gate (LIVE_PARAMS), MACD contradiction veto, ADX
 *   chop gate, ATM option at Black-Scholes, 1R breakeven ratchet, 1.5R
 *   chandelier profit trail, targets capped +50%/step, opposite-side
 *   invalidation, 15:20 close, full Zerodha charges, measured slippage.
 *   (OI-flow confirmation, our other good point, cannot be reconstructed
 *   before 2026-08-31 — Zerodha purges option history at expiry.)
 *
 * Same engine, same window, same costs as the Method 2 / Method 3 year
 * backtests, so the three screens compare like for like.
 */

const { getIndexCandles } = require('./candleStoreService');
const { ScalpReport } = require('../models');
const { precompute, simulateRange, summarize, LIVE_PARAMS } = require('./method2BacktestService');
const { IST } = require('../utils/optionMath');

const IST_MIN = (t) => Math.floor(((t + IST) % 86400) / 60);
const DAY = (t) => Math.floor((t + IST) / 86400);

/** 1-min → 5-min bars anchored at 09:15 IST (same bucketing as candleStoreService). */
function resample5(oneMin) {
  const out = [];
  let cur = null;
  for (const c of oneMin) {
    const day = DAY(c.time), slot = Math.floor((IST_MIN(c.time) - 555) / 5);
    const key = `${day}:${slot}`;
    if (!cur || cur.key !== key) {
      if (cur) out.push(cur);
      cur = { key, day, time: c.time, endTime: c.time + 60, open: c.open, high: c.high, low: c.low, close: c.close, n: 1 };
    } else {
      cur.high = Math.max(cur.high, c.high); cur.low = Math.min(cur.low, c.low); cur.close = c.close;
      cur.endTime = c.time + 60; cur.n++;
    }
  }
  if (cur) out.push(cur);
  return out;
}

function emaSeries(vals, n) {
  const k = 2 / (n + 1), out = new Float64Array(vals.length);
  out[0] = vals[0];
  for (let i = 1; i < vals.length; i++) out[i] = vals[i] * k + out[i - 1] * (1 - k);
  return out;
}

const DEFAULT_RULES = {
  rangeMins: 15,          // opening range length
  wickMax: 0.25,          // wick-against-direction ≤ 25% of bar range
  firstBodyMax: 0.30,     // "indecision" first bar for the gap fade
  minGapLeft: 30,         // pts of gap still open for the fade
  entryFromMin: 9 * 60 + 30,
  lastEntryMin: 14 * 60,
  maxPerDay: 2,
  validMin: 5,            // a trigger stays valid this many minutes for the conviction gate
  useOrb: true, usePdhPdl: true, useGapFade: true, useTrend: true,
  // "all" adds the other platforms' triggers (CPR narrow-range breakout, Camarilla
  // H3/L3 reversal + H4/L4 breakout, 14:00 day-extreme breakout)
  useCpr: false, useCamarilla: false, use2pm: false,
};
const TRIGGER_SETS = {
  yt:     {},
  all:    { useCpr: true, useCamarilla: true, use2pm: true },
};
/** Expiry-day discipline (ours, data-derived): no new entries after 13:00, force-close 13:30. */
const EXPIRY_RULE = { expiryLastEntryMin: 13 * 60, expiryExitMin: 13 * 60 + 30 };

/**
 * Builds the YT trigger as a per-1-min-candle Int8Array: +1 / −1 while a
 * trigger fired within the last `validMin` minutes, else 0 (the Method 3
 * convention, consumed by simulateRange's entrySignalAt hook).
 */
function buildYtSignal(candles, rules = {}) {
  const R = { ...DEFAULT_RULES, ...rules };
  const bars = resample5(candles);
  const closes = bars.map(b => b.close);
  const e9 = emaSeries(closes, 9), e15 = emaSeries(closes, 15);

  // per-day structures: opening range, previous-day body levels, session VWAP proxy
  const byDay = new Map();
  for (let i = 0; i < bars.length; i++) {
    const b = bars[i];
    let d = byDay.get(b.day);
    if (!d) { d = { first: i, bars: [] }; byDay.set(b.day, d); }
    d.bars.push(i);
  }
  const days = [...byDay.keys()].sort((a, b) => a - b);
  const bodyHi = new Map(), bodyLo = new Map(), closeOf = new Map();
  for (const day of days) {
    let hi = -Infinity, lo = Infinity, last = null;
    for (const i of byDay.get(day).bars) { const b = bars[i]; hi = Math.max(hi, b.open, b.close); lo = Math.min(lo, b.open, b.close); last = b.close; }
    bodyHi.set(day, hi); bodyLo.set(day, lo); closeOf.set(day, last);
  }

  const fires = [];   // { time: unix of the trigger bar's end, dir, kind }
  const nb = Math.max(1, Math.round(R.rangeMins / 5));
  for (let di = 0; di < days.length; di++) {
    const day = days[di], idx = byDay.get(day).bars;
    const prevDay = di > 0 ? days[di - 1] : null;
    const PDH = prevDay != null ? bodyHi.get(prevDay) : null, PDL = prevDay != null ? bodyLo.get(prevDay) : null, PDC = prevDay != null ? closeOf.get(prevDay) : null;
    if (idx.length < nb + 2) continue;
    const rangeHi = Math.max(...idx.slice(0, nb).map(i => bars[i].high));
    const rangeLo = Math.min(...idx.slice(0, nb).map(i => bars[i].low));
    const first = bars[idx[0]];
    const firstRange = first.high - first.low;
    // previous-day pivots for the platform triggers
    let CPR = null, CAM = null;
    if (prevDay != null) {
      const pb = byDay.get(prevDay).bars.map(i => bars[i]);
      const H = Math.max(...pb.map(b => b.high)), L = Math.min(...pb.map(b => b.low)), C = pb[pb.length - 1].close, RNG = H - L;
      const P = (H + L + C) / 3, BCv = (H + L) / 2, TCv = 2 * P - BCv;
      // narrow CPR = width below 60% of the trailing 20-day median width (computed on the fly)
      const widths = [];
      for (let k = Math.max(0, di - 21); k < di; k++) {
        const q = byDay.get(days[k]).bars.map(i => bars[i]);
        const h = Math.max(...q.map(b => b.high)), l = Math.min(...q.map(b => b.low)), c = q[q.length - 1].close;
        const pp = (h + l + c) / 3, bc = (h + l) / 2; widths.push(Math.abs(2 * pp - bc - bc) / c);
      }
      const sorted = [...widths].sort((a, b) => a - b), med = sorted.length ? sorted[Math.floor(sorted.length / 2)] : null;
      CPR = { TC: Math.max(TCv, BCv), BC: Math.min(TCv, BCv), narrow: med != null && Math.abs(TCv - BCv) / C < 0.6 * med };
      CAM = { H3: C + RNG * 1.1 / 4, H4: C + RNG * 1.1 / 2, L3: C - RNG * 1.1 / 4, L4: C - RNG * 1.1 / 2 };
    }
    let cprDone = false, camDone = false, pmDone = false, dayHi = -Infinity, dayLo = Infinity;
    const indecisive = firstRange > 0 && Math.abs(first.close - first.open) / firstRange <= R.firstBodyMax;
    let vwapSum = 0, vwapN = 0, fired = 0, orbBreak = null, pdBreak = null, gapDone = false;
    for (let j = 0; j < idx.length; j++) {
      const i = idx[j], b = bars[i], min = IST_MIN(b.time);
      vwapSum += (b.high + b.low + b.close) / 3; vwapN++;
      const vwap = vwapSum / vwapN;
      if (fired >= R.maxPerDay || (min >= R.lastEntryMin && !R.use2pm) || min >= 15 * 60) break;
      const rng = b.high - b.low;
      const prev = j > 0 ? bars[idx[j - 1]] : null;
      const okBuyBar = rng > 0 && b.close > b.open && (b.high - b.close) / rng <= R.wickMax;
      const okSellBar = rng > 0 && b.close < b.open && (b.close - b.low) / rng <= R.wickMax;
      const trendUp = !R.useTrend || (e9[i] > e15[i] && b.close > vwap);
      const trendDn = !R.useTrend || (e9[i] < e15[i] && b.close < vwap);
      const canEnter = min >= R.entryFromMin && min < R.lastEntryMin;
      let dir = 0, kind = null;

      // 1. opening range: break bar (close outside) → confirm bar takes out its extreme
      if (R.useOrb && j >= nb) {
        if (orbBreak && orbBreak.age < 3) {
          orbBreak.age++;
          if (orbBreak.dir === 1 && b.high > orbBreak.high && okBuyBar && trendUp && canEnter) { dir = 1; kind = 'ORB'; orbBreak = null; }
          else if (orbBreak.dir === -1 && b.low < orbBreak.low && okSellBar && trendDn && canEnter) { dir = -1; kind = 'ORB'; orbBreak = null; }
        } else orbBreak = null;
        if (!dir && !orbBreak) {
          if (b.close > rangeHi) orbBreak = { dir: 1, high: b.high, low: b.low, age: 0 };
          else if (b.close < rangeLo) orbBreak = { dir: -1, high: b.high, low: b.low, age: 0 };
        }
      }
      // 2. previous-day body high/low: close beyond, next bar confirms
      if (!dir && R.usePdhPdl && PDH != null && prev) {
        if (pdBreak && pdBreak.age < 2) {
          pdBreak.age++;
          if (pdBreak.dir === 1 && b.close > PDH && okBuyBar && trendUp && canEnter) { dir = 1; kind = 'PDH'; pdBreak = null; }
          else if (pdBreak.dir === -1 && b.close < PDL && okSellBar && trendDn && canEnter) { dir = -1; kind = 'PDL'; pdBreak = null; }
        } else pdBreak = null;
        if (!dir && !pdBreak) {
          if (b.close > PDH && prev.close <= PDH) pdBreak = { dir: 1, age: 0 };
          else if (b.close < PDL && prev.close >= PDL) pdBreak = { dir: -1, age: 0 };
        }
      }
      // 3. gap + indecisive first bar: fade through the first bar, toward the gap
      if (!dir && R.useGapFade && !gapDone && indecisive && PDC != null && j > 0 && min < 11 * 60 && canEnter) {
        if (first.open > PDC && b.close < first.low && (b.close - PDC) >= R.minGapLeft && okSellBar) { dir = -1; kind = 'GAP'; gapDone = true; }
        else if (first.open < PDC && b.close > first.high && (PDC - b.close) >= R.minGapLeft && okBuyBar) { dir = 1; kind = 'GAP'; gapDone = true; }
      }
      // 4. CPR narrow-range breakout (TradingView / pivot traders): first close beyond the CPR after 09:30
      if (!dir && R.useCpr && CPR && CPR.narrow && !cprDone && canEnter && prev) {
        if (b.close > CPR.TC && prev.close <= CPR.TC && okBuyBar && trendUp) { dir = 1; kind = 'CPR'; cprDone = true; }
        else if (b.close < CPR.BC && prev.close >= CPR.BC && okSellBar && trendDn) { dir = -1; kind = 'CPR'; cprDone = true; }
      }
      // 5. Camarilla: H3/L3 rejection (fade) or H4/L4 breakout (go with), open inside H3/L3
      if (!dir && R.useCamarilla && CAM && !camDone && canEnter && first.open < CAM.H3 && first.open > CAM.L3) {
        if (b.high >= CAM.H3 && b.close < CAM.H3 && okSellBar) { dir = -1; kind = 'CAM'; camDone = true; }
        else if (b.low <= CAM.L3 && b.close > CAM.L3 && okBuyBar) { dir = 1; kind = 'CAM'; camDone = true; }
        else if (b.close > CAM.H4 && okBuyBar && trendUp) { dir = 1; kind = 'CAM'; camDone = true; }
        else if (b.close < CAM.L4 && okSellBar && trendDn) { dir = -1; kind = 'CAM'; camDone = true; }
      }
      // 6. 14:00 day-extreme breakout (TradingQnA): after 14:00, close beyond the day's high/low so far
      if (R.use2pm && min < 14 * 60) { dayHi = Math.max(dayHi, b.high); dayLo = Math.min(dayLo, b.low); }
      if (!dir && R.use2pm && !pmDone && min >= 14 * 60 && min < 15 * 60 && dayHi > -Infinity) {
        if (b.close > dayHi && okBuyBar) { dir = 1; kind = '2PM'; pmDone = true; }
        else if (b.close < dayLo && okSellBar) { dir = -1; kind = '2PM'; pmDone = true; }
      }
      if (dir) { fires.push({ time: b.endTime, dir, kind }); fired++; }
    }
  }

  // project onto the 1-min series: valid for `validMin` minutes after the bar closes
  const sig = new Int8Array(candles.length);
  const kinds = new Array(candles.length).fill(null);
  let f = 0, lastFire = -1e9, lastDir = 0, lastKind = null;
  for (let i = 0; i < candles.length; i++) {
    const t = candles[i].time;
    while (f < fires.length && fires[f].time <= t) { lastFire = fires[f].time; lastDir = fires[f].dir; lastKind = fires[f].kind; f++; }
    if ((t - lastFire) < R.validMin * 60) { sig[i] = lastDir; kinds[i] = lastKind; }
  }
  return { sig, kinds, fires };
}

function monthly(trades) {
  const m = {};
  for (const t of trades) {
    const k = t.date.slice(0, 7);
    (m[k] ??= { month: k, trades: 0, wins: 0, netRs: 0 });
    m[k].trades++; if (t.netRs > 0) m[k].wins++; m[k].netRs += t.netRs;
  }
  return Object.values(m).sort((a, b) => a.month.localeCompare(b.month));
}

const KIND = (pricing, triggerSet, expiryRule) =>
  `yt-${triggerSet === 'all' ? 'all' : 'yt'}${expiryRule ? '-exp' : ''}-year${pricing === 'calibrated' ? '-cal' : ''}`;

/**
 * pricing: 'project'    — the premium model every other year backtest uses
 *          'calibrated' — IV-by-days-to-expiry multipliers fitted on the real
 *                         Sep/Oct-2026 chain, trades the current expiry
 */
async function runYtBacktest({ from = '2025-09-24', to = '2026-09-25', pricing = 'project', triggerSet = 'yt', expiryRule = false, rules = {} } = {}) {
  rules = { ...(TRIGGER_SETS[triggerSet] ?? {}), ...rules };
  const fromUnix = Math.floor(new Date(`${from}T00:00:00+05:30`).getTime() / 1000);
  const toUnix = Math.floor(new Date(`${to}T23:59:59+05:30`).getTime() / 1000);
  const candles = await getIndexCandles('NIFTY', fromUnix, toUnix);
  if (candles.length < 5000) throw new Error(`Only ${candles.length} 1-min candles in range — backfill first`);
  const { sig, kinds, fires } = buildYtSignal(candles, rules);
  const params = { ...LIVE_PARAMS, profitTrail: true, trailR: 1.5, pricing, entrySignalAt: (i) => sig[i], ...(expiryRule ? EXPIRY_RULE : {}) };
  const pre = precompute(candles);
  const trades = simulateRange(pre, params, 100, candles.length);
  // tag each trade with the trigger that opened it
  const byTime = new Map(); for (let i = 0; i < candles.length; i++) if (kinds[i]) byTime.set(candles[i].time, kinds[i]);
  for (const t of trades) {
    const unix = Math.floor(new Date(`${t.date}T${t.time}:00+05:30`).getTime() / 1000);
    t.trigger = byTime.get(unix) ?? byTime.get(unix - 60) ?? null;
  }
  const summary = summarize(trades);
  summary.requiredWinRate = (summary.avgWinRs + summary.avgLossRs) > 0
    ? +((summary.avgLossRs / (summary.avgLossRs + summary.avgWinRs)) * 100).toFixed(1) : null;
  summary.byOutcome = {}; summary.byTrigger = {};
  for (const t of trades) {
    summary.byOutcome[t.outcome] = (summary.byOutcome[t.outcome] ?? 0) + 1;
    const k = t.trigger ?? 'other';
    (summary.byTrigger[k] ??= { trades: 0, wins: 0, netRs: 0 });
    summary.byTrigger[k].trades++; if (t.netRs > 0) summary.byTrigger[k].wins++; summary.byTrigger[k].netRs += t.netRs;
  }
  summary.avgHoldMins = trades.length ? +(trades.reduce((a, t) => a + t.heldMins, 0) / trades.length).toFixed(0) : 0;
  summary.monthly = monthly(trades);
  summary.profitable = summary.netRs > 0;
  summary.triggersFired = fires.length;
  summary.triggerKinds = fires.reduce((a, f) => { a[f.kind] = (a[f.kind] ?? 0) + 1; return a; }, {});

  const report = {
    kind: KIND(pricing, triggerSet, expiryRule),
    // scalp_reports.label is varchar(80)
    label: `${triggerSet === 'all' ? 'YT+plat' : 'YT'}${expiryRule ? '+exp' : ''} × ours ${from}→${to} (g${params.gate}, ${pricing})`,
    params: {
      from, to, qty: 130, lots: 2, gate: params.gate, weights: { ...LIVE_PARAMS }, pricing, triggerSet, expiryRule,
      slippagePts: params.slip ?? 0.13, rules: { ...DEFAULT_RULES, ...rules },
      entry: 'THEIR trigger (opening-range confirm / previous-day body break confirm / gap-indecision fade, wick filter, EMA9>15 + VWAP trend, 09:30–14:00, ≤2/day) AND OUR Method 2 conviction ≥ gate within 5 minutes',
      exits: 'OUR live exit rules: targets capped ≤1.5×/2×/2.25× entry, 1R breakeven ratchet, 1.5R profit trail, trailing after T1/T2, invalidation, EOD 15:20',
      premiums: pricing === 'calibrated'
        ? 'Black-Scholes, realised vol × IV multipliers measured on the real chain (8+d 1.16, 4–7d 1.05, 2–3d 1.3, 1d 1.75, expiry 2.5), current expiry'
        : 'Black-Scholes from 1-min spot with 20-day historical vol, next-week roll on expiry day (the project convention)',
    },
    summary, trades,
  };
  const row = await ScalpReport.create({ kind: report.kind, label: report.label, params: report.params, summary, trades });
  return { id: row.id, ...report };
}

async function latestYtReport(pricing = 'project', triggerSet = 'yt', expiryRule = false) {
  return ScalpReport.findOne({ where: { kind: KIND(pricing, triggerSet, expiryRule) }, order: [['created_at', 'DESC']] });
}

module.exports = { runYtBacktest, latestYtReport, buildYtSignal, DEFAULT_RULES };
