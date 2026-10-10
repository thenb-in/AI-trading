'use strict';

// Thin controller for Method 2: no req/res, no models — orchestrates the
// engine, the trade lifecycle, the executor mirror and the backtests. The P&L
// shaping that spans services (autotrade panel, day book) lives here; model
// access stays inside each owning service.
const method2EngineService = require('../services/method2EngineService');
const m2trade = require('../services/method2TradeService');
const method2BacktestService = require('../services/method2BacktestService');
const execution = require('../services/executionService');
const tickerService = require('../services/tickerService');
const { estimateCosts } = require('../services/scalpService');

const { MIN_DIRECTION_PCT } = method2EngineService;

// ── Live analysis ──────────────────────────────────────────────────────────
async function getMethod2() {
  return method2EngineService.getMethod2();
}

// ── Trade pulse: cheap heartbeat the screen-effects widget polls ────────────
async function getPulse() {
  const p = await m2trade.tradePulse();
  // overlay the WEBSOCKET premium (sub-second) on the ledger's last mark
  if (p.active?.tradingsymbol) {
    try {
      const chain = tickerService.getChain('NIFTY');
      outer: for (const row of chain.rows ?? []) {
        for (const side of ['CE', 'PE']) {
          const c = row[side];
          if (c?.tradingsymbol === p.active.tradingsymbol && c.ltp != null && (c.ageMs ?? 1e9) < 10000) {
            p.active.last = c.ltp; p.active.live = true; break outer;
          }
        }
      }
    } catch { /* ledger mark stands */ }
  }
  // last computed conviction (from the analysis cache) for the enter-now meter
  const cached = method2EngineService.getM2CacheBody(30000);
  if (cached) {
    // live spot (websocket, sub-second) + the concrete unlock levels, so the
    // meter can be PROACTIVE: not just "63%", but what must happen
    let spotLive = null;
    try {
      const c = tickerService.getChain('NIFTY'); if ((c.spotAgeMs ?? 1e9) < 10000) {
        spotLive = c.spot;
      }
    } catch {}
    p.conviction = {
      bullPct: cached.bullPct, bearPct: cached.bearPct,
      macdCrossover: cached.macd?.crossover ?? 'none',
      prime: cached.prime === true,
      spotLive,
      buyTrig: cached.breakout?.buyTrig ?? null,
      sellTrig: cached.breakout?.sellTrig ?? null,
      ema20: cached.indicators?.ema20 ?? null,
      wallRes: cached.oiSr?.resistance?.strike ?? null,
      wallSup: cached.oiSr?.support?.strike ?? null
    };
  }
  return p;
}

// ── Auto-execution switch + audit ───────────────────────────────────────────
async function getAutotradeState() {
  const [status, orders, today] = await Promise.all([
    execution.dayStatus(),
    execution.recentOrders(30),
    m2trade.todaysTrades()
  ]);
  const trades = today.map(t => {
    const entry = Number(t.entry_premium);
    const exit = t.exit_premium != null ? Number(t.exit_premium) : (t.last_premium != null ? Number(t.last_premium) : null);
    const netRs = exit != null ? Math.round((exit - entry) * 130 - estimateCosts(entry, exit, 130)) : null;
    return {
      id: t.id, status: t.status, direction: t.direction, tradingsymbol: t.tradingsymbol,
      entryTime: t.entry_time, exitTime: t.exit_time, reason: t.resolve_reason,
      entry, exit, trailSl: Number(t.trail_sl), targetsHit: t.targets_hit,
      netRs, live: t.status === 'active'
    };
  });
  const dayNetRs = trades.filter(t => !t.live && t.netRs != null).reduce((a, t) => a + t.netRs, 0);
  const account = await execution.accountState(today.find(t => t.status === 'active') ?? null);
  return { ...status, orders, trades, dayNetRs, account };
}

async function setAutotradeMode(mode) {
  return { mode: await execution.setMode(mode) };
}

// ── Catch-up entry — fired only by the user's explicit click on /live ───────
async function catchUp() {
  const trade = await m2trade.getActive();
  if (!trade) {
    const err = new Error(`No active trade to catch up`);
    err.noActive = true;
    throw err;
  }
  return execution.catchUpEntry(trade);
}

// ── Apply suggested levels to the user's own GTT ─────────────────────────────
async function modifyGtt({ tradingsymbol, sl, target }) {
  return execution.modifyPositionGtt({ tradingsymbol, sl, target });
}

// ── Day book: every trading day's closed P&L in hand, from the whole ledger ──
async function getDaybook() {
  const rows = await m2trade.closedTradesWithExit();
  const days = new Map();
  for (const t of rows) {
    const d = new Date(new Date(t.exit_time).getTime() + 19800 * 1000).toISOString().slice(0, 10);
    const entry = Number(t.entry_premium), exit = Number(t.exit_premium);
    const netRs = Math.round((exit - entry) * 130 - estimateCosts(entry, exit, 130));
    let row = days.get(d);
    if (!row) {
      row = { date: d, trades: 0, wins: 0, netRs: 0 }; days.set(d, row);
    }
    row.trades++; if (netRs > 0) {
      row.wins++;
    } row.netRs += netRs;
  }
  const list = [...days.values()].sort((a, b) => b.date.localeCompare(a.date));
  return { days: list, totalRs: list.reduce((a, r) => a + r.netRs, 0) };
}

// ── Backtests: run / latest / CSV for Method 2, Method 3, Method 2 + ─────────
async function runMethod2Year({ from, to } = {}) {
  const r = await method2BacktestService.runYearBacktest({ from: from || undefined, to: to || undefined });
  return { id: r.id, label: r.label, params: r.params, summary: r.summary, byDay: r.byDay };
}
async function latestMethod2Year() {
  return method2BacktestService.latestYearReport();
}

async function runMethod3Year({ from, to } = {}) {
  const r = await method2BacktestService.runMethod3Backtest({ from: from || undefined, to: to || undefined });
  return { id: r.id, label: r.label, params: r.params, summary: r.summary };
}
async function latestMethod3Year() {
  return method2BacktestService.latestM3Report();
}

async function runMethod2PlusYear({ from, to } = {}) {
  const r = await method2BacktestService.runPlusBacktest({ from: from || undefined, to: to || undefined });
  return { id: r.id, label: r.label, params: r.params, summary: r.summary, byDay: r.byDay };
}
async function latestMethod2PlusYear() {
  const row = await method2BacktestService.latestPlusReport();
  if (!row) {
    return null;
  }
  return { ...row.toJSON(), plusParams: method2BacktestService.PLUS_PARAMS };
}

// Returns { filename, csv } or null when there is no report yet.
function csvFrom(row, prefix) {
  if (!row) {
    return null;
  }
  return {
    filename: `${prefix}_backtest_${row.params?.from}_${row.params?.to}.csv`,
    csv: method2BacktestService.tradesToCsv(row.trades)
  };
}
async function method2YearCsv() {
  return csvFrom(await method2BacktestService.latestYearReport(), 'method2');
}
async function method3YearCsv() {
  return csvFrom(await method2BacktestService.latestM3Report(), 'method3');
}
async function method2PlusYearCsv() {
  return csvFrom(await method2BacktestService.latestPlusReport(), 'method2plus');
}

module.exports = {
  MIN_DIRECTION_PCT,
  getMethod2,
  getPulse,
  getAutotradeState,
  setAutotradeMode,
  catchUp,
  modifyGtt,
  getDaybook,
  runMethod2Year, latestMethod2Year, method2YearCsv,
  runMethod3Year, latestMethod3Year, method3YearCsv,
  runMethod2PlusYear, latestMethod2PlusYear, method2PlusYearCsv
};
