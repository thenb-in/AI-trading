// Thin controller: no req/res, no models — orchestrates the execution service
// behind the auto-trade / live-execution endpoints.
//
// Cross-feature reads are lazy-required so this controller loads (and the
// server boots) before the F2/F3 services land, matching the source handler
// that required them inline. See MIGRATION FINDINGS for the exact weave deps:
//   - scalpService.estimateCosts  (F3)
//   - method2TradeService.getActive (F2)
const execution = require('../services/executionService');

// Auto-order state for the live-trading screen: mode + limits + today's counts,
// the execution audit trail, today's Method 2 trades enriched with net-of-cost
// P&L, the day's closed net, and the live Zerodha account read-back.
async function getAutotradeState() {
  const { estimateCosts } = require('../services/scalpService'); // F3 — see FINDINGS
  const [status, orders, today] = await Promise.all([
    execution.dayStatus(),
    execution.recentOrders(30),
    execution.todaysTrades()
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

async function setMode(mode) {
  return execution.setMode(mode);
}

// The currently active Method 2 trade (null when flat) — needed by the catch-up
// flow to decide whether there is anything to enter.
async function getActiveTrade() {
  const m2trade = require('../services/method2TradeService'); // F2 — see FINDINGS
  return m2trade.getActive();
}

async function catchUpEntry(trade) {
  return execution.catchUpEntry(trade);
}

async function modifyGtt({ tradingsymbol, sl, target }) {
  return execution.modifyPositionGtt({ tradingsymbol, sl, target });
}

module.exports = {
  getAutotradeState,
  setMode,
  getActiveTrade,
  catchUpEntry,
  modifyGtt
};
