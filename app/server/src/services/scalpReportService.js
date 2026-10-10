'use strict';

/**
 * Scalp backtest reports — runs the +target/-stop rule against the archive and
 * persists every result to scalp_reports.
 *
 * Two engines:
 *   - real-premium: regime from archived 1-min index candles, entries/exits on
 *     archived 1-min candles of REAL option contracts. No Black-Scholes at any
 *     point. Limited to the window the daily harvest has captured.
 *   - bs-1min: the scalpService backtest on archived 1-min index candles with
 *     modelled premiums. Coarser truth, much longer window.
 *
 * Every trade in both engines is exactly QTY = 130 (2 NIFTY lots) — the size
 * is a constant of the system, never a parameter.
 */

const { ScalpReport } = require('../models');
const { detectRangeRegime, estimateCosts, runScalpBacktest, QTY, REGIME, REGIME_STRICT } = require('./scalpService');
const { getIndexCandles, loadOptionContractsFromDb } = require('./candleStoreService');
const { IST, istMinutes, isMarketOpen, isNearClose } = require('../utils/optionMath');

const CAP = 250;              // entry premium ceiling (matches scalpService)
const SLIPPAGE = 0.25;        // pts per side
/**
 * No timeout: a trade is held until the target or the stop is hit. The only
 * other exit is the session-end force-close — nothing carries overnight.
 */
const EXIT_CUTOFF_MIN = 15 * 60 + 20;   // 15:20 IST
const MAX_SAVED_TRADES = 300; // cap the JSONB trade log per report

// ---------------------------------------------------------------------------
// Data loading — Postgres only, no files
// ---------------------------------------------------------------------------

async function loadIndexMinutes(symbol = 'NIFTY', fromUnix = 0) {
  return getIndexCandles(symbol, fromUnix, Math.floor(Date.now() / 1000));
}

// ---------------------------------------------------------------------------
// Real-premium engine
// ---------------------------------------------------------------------------

/**
 * OI flow over the last `M` minutes: put writers adding OI at/below spot are
 * defending the floor (bullish); call writers adding OI at/above spot are
 * capping the ceiling (bearish). Computed from harvested per-minute candle OI.
 */
function oiFlowAt(contracts, t, spot, M = 10) {
  let peBelow = 0, ceAbove = 0, seen = 0;
  for (const c of contracts) {
    if (!c.strike) continue;
    const now = c.byTime.get(t), then = c.byTime.get(t - M * 60);
    if (!now?.oi || !then?.oi) continue;
    const d = now.oi - then.oi;
    seen++;
    if (c.type === 'PE' && c.strike <= spot) peBelow += d;
    if (c.type === 'CE' && c.strike >= spot) ceAbove += d;
  }
  return { peBelow, ceAbove, seen };
}

function flowAgrees(flow, direction) {
  if (flow.seen < 10) return false;
  return direction === 'BUY'
    ? flow.peBelow > 0 && flow.peBelow > Math.abs(flow.ceAbove)
    : flow.ceAbove > 0 && flow.ceAbove > Math.abs(flow.peBelow);
}

async function runRealPremiumBacktest({ targetPts = 2, stopPts = 5, strict = false, oiFlow = false, lots = 2, skipExpiryDays = false, _data = null } = {}) {
  // Position size. Brokerage is FLAT per order, so friction per lot falls as
  // lots rise — profitability does not simply scale linearly with size.
  const qty = 65 * lots;
  const contracts = _data?.contracts ?? await loadOptionContractsFromDb();
  if (contracts.length === 0) throw new Error('No harvested option candles in the DB yet');

  const tMin = Math.min(...contracts.map(c => c.first));
  const idx = _data?.idx ?? await loadIndexMinutes('NIFTY', tMin - 3600);

  // Expiry-day filter: known expiry dates from the harvested contracts, plus
  // every date sharing their weekday — weeklies expire on a fixed weekday
  // (currently Tuesday), including weeks whose contracts are already purged.
  const expiryDates = new Set(contracts.map(c => String(c.expiry)));
  const expiryDows  = new Set([...expiryDates].map(d => new Date(`${d}T00:00:00Z`).getUTCDay()));
  const isExpiryDay = (unix) => {
    const dt = new Date((unix + IST) * 1000);
    return expiryDates.has(dt.toISOString().slice(0, 10)) || expiryDows.has(dt.getUTCDay());
  };
  if (idx.length < 60) throw new Error('Not enough archived 1-min index candles for the option window');

  const pickContract = (type, t) => {
    let best = null, bestPrem = -1;
    for (const c of contracts) {
      if (c.type !== type) continue;
      const k = c.byTime.get(t);
      if (!k || !(k.open > 0) || k.open > CAP) continue;
      if (k.open > bestPrem) { bestPrem = k.open; best = { c, entry: k.open }; }
    }
    return best;
  };

  const trades = [];
  let curDay = null, consec = 0, halted = false, haltedDays = 0;
  let i = REGIME.WINDOW;
  while (i < idx.length - 2) {
    const cur = idx[i];
    if (!isMarketOpen(cur.time) || isNearClose(cur.time)) { i++; continue; }
    const day = Math.floor((cur.time + IST) / 86400);
    if (day !== curDay) { curDay = day; consec = 0; if (halted) haltedDays++; halted = false; }
    if (halted) { i++; continue; }
    if (skipExpiryDays && isExpiryDay(cur.time)) { i++; continue; }

    const win = idx.slice(i - REGIME.WINDOW, i);
    if (win[0].time !== cur.time - REGIME.WINDOW * 60) { i++; continue; }
    const regime = detectRangeRegime(win, cur.close, strict ? REGIME_STRICT : REGIME);
    if (!regime.inRange || !regime.direction) { i++; continue; }

    // Option-chain confirmation: only trade when writers are building on the
    // side that defends this entry.
    if (oiFlow && !flowAgrees(oiFlowAt(contracts, cur.time, cur.close), regime.direction)) { i++; continue; }

    const entryT = cur.time + 60;
    const type = regime.direction === 'BUY' ? 'CE' : 'PE';
    const pick = pickContract(type, entryT);
    if (!pick) { i++; continue; }

    const entry = pick.entry + SLIPPAGE;
    const target = pick.entry + targetPts;
    const stop = pick.entry - stopPts;
    // Hold until target or stop — the only other exit is the 15:20 force-close.
    let outcome = 'eod', exitPrem = entry, exitK = 1;
    for (let k = 0; ; k++) {
      const t = entryT + k * 60;
      if (istMinutes(t) >= EXIT_CUTOFF_MIN || k > 500) break;
      const oc = pick.c.byTime.get(t);
      if (!oc) continue;                      // gap in the archive: step over it
      exitK = k; exitPrem = oc.close;
      const hitStop = oc.low <= stop, hitTgt = oc.high >= target;
      if (hitStop) { outcome = 'loss'; exitPrem = stop; break; }   // stop wins ties
      if (hitTgt)  { outcome = 'win';  exitPrem = target; break; }
    }
    const exitFill   = exitPrem - SLIPPAGE;
    const grossRs    = (exitPrem - pick.entry) * qty;      // before ANY friction
    const slippageRs = SLIPPAGE * 2 * qty;                 // both sides of the spread
    const chargesRs  = estimateCosts(entry, exitFill, qty); // brokerage+STT+txn+GST+stamp
    trades.push({
      time: cur.time,
      date: new Date((cur.time + IST) * 1000).toISOString().slice(0, 10),
      hhmm: new Date((cur.time + IST) * 1000).toISOString().slice(11, 16),
      dir: regime.direction,
      sym: pick.c.sym,
      entry: Number(entry.toFixed(2)),
      exit: Number(exitFill.toFixed(2)),
      outcome,
      grossRs: Math.round(grossRs),
      chargesRs: Math.round(chargesRs),
      slippageRs: Math.round(slippageRs),
      netRs: Math.round(grossRs - slippageRs - chargesRs), // what lands in hand
      heldMins: exitK,
    });
    if (outcome === 'loss') { if (++consec >= 3) halted = true; }
    else if (outcome === 'win') consec = 0;
    i += exitK + 2;
  }

  const label = `+${targetPts}/-${stopPts}${strict ? ' strict' : ''}${oiFlow ? '+OIflow' : ''}${skipExpiryDays ? ' no-expiry' : ''}${lots !== 2 ? ` ${lots}L` : ''} real premiums`;
  return finishReport('real-premium', { targetPts, stopPts, strict, oiFlow, skipExpiryDays }, trades, {
    labelOverride: label,
    lots, qty,
    window: {
      from: new Date(idx[0].time * 1000).toISOString().slice(0, 10),
      to:   new Date(idx[idx.length - 1].time * 1000).toISOString().slice(0, 10),
    },
    contractsAvailable: contracts.length,
    daysHalted: haltedDays,
  });
}

// ---------------------------------------------------------------------------
// BS engine on archived 1-min candles
// ---------------------------------------------------------------------------

async function runBs1minBacktest({ targetPts = 2, stopPts = 5, days = 30 } = {}) {
  const cut = Math.floor(Date.now() / 1000) - days * 86400;
  const candles = await loadIndexMinutes('NIFTY', cut);
  if (candles.length < 500) throw new Error('Not enough archived 1-min index candles — run the index archive first');
  const r = await runScalpBacktest('NIFTY', {
    candles, slippagePts: SLIPPAGE, targetPts, stopPts,
    maxHoldMinutes: 380,          // longer than any session: no timeout in practice
    exitCutoffMin: EXIT_CUTOFF_MIN,
  });
  // runScalpBacktest caps its returned trade LOG at 200 rows, so the summary
  // must come from the run's own aggregate fields (computed over every trade),
  // never be recomputed from the truncated log.
  const trades = (r.trades ?? []).map(t => ({
    date: t.date, hhmm: t.time, dir: t.direction, sym: t.tradingsymbol,
    entry: t.entryPrem, exit: t.exitPrem, outcome: t.outcome, netRs: t.netRs, heldMins: t.heldMins,
  }));
  return {
    kind: 'bs-1min',
    label: `+${targetPts}/-${stopPts} BS 1-min`,
    params: { targetPts, stopPts, days, qty: QTY, lots: 2, capPremium: CAP,
              slippagePts: SLIPPAGE,
              holdMode: 'until target/stop, force-close 15:20, no carry',
              window: { days }, daysHalted: r.daysHaltedByCircuitBreaker },
    summary: {
      trades: r.totalTrades, wins: r.wins, losses: r.losses,
      targetHits: r.targetHits, stopHits: r.stopHits, eodExits: r.timeouts,
      chargesRs: r.totalCostsRs,
      slippageRs: Math.round(r.totalTrades * SLIPPAGE * 2 * QTY),
      grossRs: r.netPnlRs + r.totalCostsRs + Math.round(r.totalTrades * SLIPPAGE * 2 * QTY),
      winRate: r.winRate, requiredWinRate: r.requiredWinRate,
      edgePts: r.edgePts, profitable: r.profitable,
      netRs: r.netPnlRs, avgWinRs: r.avgWinRs, avgLossRs: r.avgLossRs,
      profitFactor: r.profitFactor,
    },
    byDay: null,   // the capped log cannot honestly reconstruct full days
    trades,
  };
}

// ---------------------------------------------------------------------------
// Shared summarising + persistence
// ---------------------------------------------------------------------------

function finishReport(kind, shape, trades, extra = {}) {
  const { labelOverride, ...extraParams } = extra;
  const wins = trades.filter(t => t.netRs > 0);
  const losses = trades.filter(t => t.netRs <= 0);
  const grossWin = wins.reduce((s, t) => s + t.netRs, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.netRs, 0));
  const avgWin = wins.length ? grossWin / wins.length : 0;
  const avgLoss = losses.length ? grossLoss / losses.length : 0;
  const winRate = trades.length ? Number((wins.length / trades.length * 100).toFixed(1)) : 0;
  const required = avgWin > 0 && avgLoss > 0
    ? Number((avgLoss / (avgLoss + avgWin) * 100).toFixed(1)) : null;

  const byDayMap = {};
  for (const t of trades) {
    (byDayMap[t.date] ??= { date: t.date, trades: 0, wins: 0, netRs: 0 });
    byDayMap[t.date].trades++;
    if (t.netRs > 0) byDayMap[t.date].wins++;
    byDayMap[t.date].netRs += t.netRs;
  }

  return {
    kind,
    label: labelOverride ?? `+${shape.targetPts}/-${shape.stopPts} ${kind === 'real-premium' ? 'real premiums' : 'BS 1-min'}`,
    params: { ...shape, qty: QTY, lots: 2, capPremium: CAP, slippagePts: SLIPPAGE,
              holdMode: 'until target/stop, force-close 15:20, no carry', ...extraParams },
    summary: {
      trades: trades.length,
      wins: wins.length,
      losses: losses.length,
      targetHits: trades.filter(t => t.outcome === 'win').length,
      stopHits: trades.filter(t => t.outcome === 'loss').length,
      eodExits: trades.filter(t => t.outcome === 'eod' || t.outcome === 'timeout').length,
      grossRs: trades.reduce((a, t) => a + (t.grossRs ?? t.netRs), 0),
      chargesRs: trades.reduce((a, t) => a + (t.chargesRs ?? 0), 0),
      slippageRs: trades.reduce((a, t) => a + (t.slippageRs ?? 0), 0),
      winRate,
      requiredWinRate: required,
      edgePts: required != null ? Number((winRate - required).toFixed(1)) : null,
      profitable: required != null && winRate > required,
      netRs: trades.reduce((s, t) => s + t.netRs, 0),
      avgWinRs: Math.round(avgWin),
      avgLossRs: Math.round(avgLoss),
      profitFactor: grossLoss > 0 ? Number((grossWin / grossLoss).toFixed(2)) : null,
    },
    byDay: Object.values(byDayMap),
    trades: trades.slice(-MAX_SAVED_TRADES),
  };
}

async function persistReport(r) {
  const row = await ScalpReport.create({
    kind: r.kind, label: r.label, params: r.params,
    summary: r.summary, by_day: r.byDay, trades: r.trades,
  });
  return row.id;
}

/**
 * The full comparison the dashboard shows: +1, +2, +3 (and +4) against -5,
 * on both engines, every row persisted. 130 qty everywhere, by construction.
 */
async function runShapeReport() {
  const shapes = [
    { targetPts: 1, stopPts: 5 },
    { targetPts: 2, stopPts: 5 },
    { targetPts: 3, stopPts: 5 },
    { targetPts: 4, stopPts: 5 },
  ];
  const out = { realPremium: [], bs1min: [], savedIds: [] };
  for (const shape of shapes) {
    const r = await runRealPremiumBacktest(shape);
    out.savedIds.push(await persistReport(r));
    out.realPremium.push({ label: r.label, params: r.params, summary: r.summary, byDay: r.byDay });
  }
  // High-selectivity variants: strict regime + option-chain confirmation.
  for (const shape of [{ targetPts: 2, stopPts: 5 }, { targetPts: 3, stopPts: 5 }, { targetPts: 4, stopPts: 5 }]) {
    const r = await runRealPremiumBacktest({ ...shape, strict: true, oiFlow: true });
    out.savedIds.push(await persistReport(r));
    out.realPremium.push({ label: r.label, params: r.params, summary: r.summary, byDay: r.byDay });
  }
  for (const shape of shapes) {
    const r = await runBs1minBacktest({ ...shape, days: 30 });
    out.savedIds.push(await persistReport(r));
    out.bs1min.push({ label: r.label, params: r.params, summary: r.summary });
  }

  // Project the best (only profitable) config to a month, and persist that too.
  const best = out.realPremium.find(r => r.label.includes('+3/-5 strict+OIflow'));
  if (best?.byDay?.length >= 2) {
    const proj = buildMonthlyProjection(best);
    out.savedIds.push(await persistReport(proj));
    out.projection = { label: proj.label, params: proj.params, summary: proj.summary, byDay: proj.byDay };
  }
  return out;
}

/**
 * Monthly projection from the best real-premium run: average in-hand per
 * measured session extrapolated to a ~20-session month, with the honest
 * range (mean*N +/- std*sqrt(N)). Persisted like any other report so the
 * estimate and the data behind it are never separated.
 */
function buildMonthlyProjection(report, projSessions = 20) {
  const days = (report.byDay ?? []).slice().sort((a, b) => a.date.localeCompare(b.date));
  if (days.length < 2) throw new Error('Not enough sessions to project from');
  const vals = days.map(d => d.netRs);
  const n = vals.length;
  const mean = vals.reduce((a, v) => a + v, 0) / n;
  const std = Math.sqrt(vals.reduce((a, v) => a + (v - mean) ** 2, 0) / n);
  const projected = mean * projSessions;
  const spread = std * Math.sqrt(projSessions);
  return {
    kind: 'projection',
    label: `Monthly projection — ${report.label}`,
    params: { basedOn: report.label, sessionsMeasured: n, projSessions,
              window: report.params?.window ?? null, qty: QTY, lots: 2 },
    summary: {
      avgPerSessionRs: Math.round(mean),
      stdPerSessionRs: Math.round(std),
      projectedMonthRs: Math.round(projected),
      rangeLowRs: Math.round(projected - spread),
      rangeHighRs: Math.round(projected + spread),
      measuredTotalRs: vals.reduce((a, v) => a + v, 0),
      note: 'In-hand figures (after all charges + slippage). Daily std dev is ' +
            'several times the daily mean, so the month is not yet statistically ' +
            'distinguishable from zero — the range narrows as the harvest adds sessions.',
    },
    byDay: days,
    trades: null,
  };
}

/**
 * The full comparison dashboard: every strategy x 2/4/6 lots, on the same
 * harvested real-premium window, persisted as ONE 'matrix' report. Data is
 * loaded once and shared across all cells.
 */
const MATRIX_STRATEGIES = [
  { key: 'base +2/-5',                targetPts: 2, stopPts: 5 },
  { key: 'base +3/-5',                targetPts: 3, stopPts: 5 },
  { key: 'base +4/-5',                targetPts: 4, stopPts: 5 },
  { key: 'strict+OIflow +2/-5',       targetPts: 2, stopPts: 5, strict: true, oiFlow: true },
  { key: 'strict+OIflow +3/-5',       targetPts: 3, stopPts: 5, strict: true, oiFlow: true },
  { key: 'strict+OIflow +4/-5',       targetPts: 4, stopPts: 5, strict: true, oiFlow: true },
  { key: 'strict+OIflow +2/-5 no-expiry', targetPts: 2, stopPts: 5, strict: true, oiFlow: true, skipExpiryDays: true },
  { key: 'strict+OIflow +3/-5 no-expiry', targetPts: 3, stopPts: 5, strict: true, oiFlow: true, skipExpiryDays: true },
  { key: 'strict+OIflow +4/-5 no-expiry', targetPts: 4, stopPts: 5, strict: true, oiFlow: true, skipExpiryDays: true },
];
const MATRIX_LOTS = [2, 4, 6];

async function runMatrixReport() {
  const contracts = await loadOptionContractsFromDb();
  if (contracts.length === 0) throw new Error('No harvested option candles in the DB yet');
  const tMin = Math.min(...contracts.map(c => c.first));
  const idx = await loadIndexMinutes('NIFTY', tMin - 3600);
  const _data = { contracts, idx };

  const rows = [];
  let window = null;
  for (const strat of MATRIX_STRATEGIES) {
    for (const lots of MATRIX_LOTS) {
      const r = await runRealPremiumBacktest({ ...strat, lots, _data });
      window = window ?? r.params.window;
      const s = r.summary;
      rows.push({
        strategy: strat.key, lots,
        trades: s.trades, winRate: s.winRate, requiredWinRate: s.requiredWinRate,
        grossRs: s.grossRs, chargesRs: s.chargesRs, slippageRs: s.slippageRs,
        netRs: s.netRs, profitable: s.profitable,
      });
    }
  }

  const report = {
    kind: 'matrix',
    label: 'Strategy × lots matrix (real premiums)',
    params: { lots: MATRIX_LOTS, strategies: MATRIX_STRATEGIES.map(x => x.key), window, qty: 'lots × 65' },
    summary: { rows, cells: rows.length, profitableCells: rows.filter(r => r.profitable).length },
    byDay: null,
    trades: null,
  };
  const id = await persistReport(report);
  return { id, ...report };
}

async function listReports(limit = 40) {
  const rows = await ScalpReport.findAll({
    order: [['created_at', 'DESC']],
    limit,
    attributes: ['id', 'created_at', 'kind', 'label', 'params', 'summary', 'by_day'],
  });
  return rows;
}

async function getReport(id) {
  return ScalpReport.findByPk(id);
}

module.exports = { runRealPremiumBacktest, runBs1minBacktest, runShapeReport, runMatrixReport, listReports, getReport };
