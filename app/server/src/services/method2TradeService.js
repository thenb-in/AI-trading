'use strict';

/**
 * Trade lifecycle for Method 2 — the professional's rulebook, enforced by data.
 *
 * When a signal clears the gate, it becomes ONE active trade with frozen
 * levels. From then on the question is never "does the entry mood persist?"
 * but "what do the levels say?":
 *
 *   stays ACTIVE  — premium above the (trailing) stop, defending wall intact,
 *                   thesis not reversed. A dip toward the stop is reported as
 *                   drawdown with the levels shown — the "keep calm" case,
 *                   earned by data, not by hope.
 *   STOPPED       — premium at/under the trailing stop, or spot has broken
 *                   the defending OI wall the stop was built on.
 *   TARGET        — T3 reached (T1/T2 ratchet the stop: after T1 the stop
 *                   moves to entry, after T2 to T1 — profits stop being
 *                   returnable, exactly as a pro trails).
 *   INVALIDATED   — the analysis has flipped to the OPPOSITE side with gate
 *                   conviction. Levels intact or not, a reversed thesis is an
 *                   exit; holding against your own signal is hope, not calm.
 *   EOD           — 15:20 force-close, nothing carries overnight.
 *
 * One trade at a time; new signals while one is active are informational only.
 */

const { Op } = require('sequelize');
const logger = require('@startup/logger');
const { Method2Trade } = require('../models');
const { getOptionQuotesByTradingSymbols } = require('./broker');
// real-account execution mirror (OFF unless the user arms it); its failures
// are logged, never thrown — the signal ledger must stay truthful regardless
const execution = require('./executionService');
const { istMinutes, isMarketOpen } = require('../utils/optionMath');

const EXIT_CUTOFF_MIN = 15 * 60 + 20;
const GATE = 70;                        // conviction to open or invalidate — walk-forward validated (was 65)

async function getActive() {
  return Method2Trade.findOne({ where: { status: 'active' }, order: [['entry_time', 'DESC']] });
}

async function openTrade(rec, direction, confidence, reasons) {
  if (await getActive()) return null;                    // one trade at a time
  const nowMin = istMinutes(Math.floor(Date.now() / 1000));
  // entries allowed all day; only the last minutes are mechanical — a trade
  // opened after 15:15 cannot live before the 15:20 no-carry force-close
  if (nowMin >= 15 * 60 + 15) return null;
  return Method2Trade.create({
    entry_time: new Date(),
    status: 'active',
    direction,
    tradingsymbol: rec.tradingsymbol,
    option_type: direction === 'BUY' ? 'CE' : 'PE',
    strike: rec.strike ?? null,
    expiry: rec.expiry ?? null,
    confidence,
    spot_entry: rec.spotPrice ?? null,
    entry_premium: rec.premiumEntry,
    sl_premium: rec.premiumSL,
    trail_sl: rec.premiumSL,
    t1_premium: rec.premiumT1,
    t2_premium: rec.premiumT2,
    t3_premium: rec.premiumT3,
    ul_levels: { sl: rec.ulSl, t1: rec.ulT1, t2: rec.ulT2, t3: rec.ulT3, basis: rec.exitBasis, iv: rec.iv },
    last_premium: rec.premiumEntry,
    max_premium: rec.premiumEntry,
    min_premium: rec.premiumEntry,
    entry_reasons: reasons ?? null,
  }).then(async (trade) => {
    await execution.onTradeOpened(trade).catch(() => {});
    return trade;
  });
}

async function resolve(trade, status, exitPremium, reason) {
  await trade.update({
    status, exit_time: new Date(),
    exit_premium: exitPremium, resolve_reason: reason.slice(0, 200),
  });
  logger.info(`[m2trade] ${trade.tradingsymbol} ${status}: ${reason}`);
  await execution.onTradeResolved(trade, status).catch(() => {});
  return trade;
}

/**
 * Marks the active trade against live data. `ctx` may carry {spot,
 * oppositeConviction, premium}; missing pieces are fetched or skipped.
 * Returns the trade (possibly resolved) or null when none is active.
 */
async function evaluateActive(ctx = {}) {
  const trade = await getActive();
  if (!trade) return null;
  const nowSec = Math.floor(Date.now() / 1000);

  let premium = ctx.premium;
  if (premium == null) {
    try {
      const q = await getOptionQuotesByTradingSymbols([trade.tradingsymbol]);
      premium = q?.[trade.tradingsymbol]?.ltp;
    } catch { /* chain unreachable — evaluate what we can */ }
  }

  const entry = Number(trade.entry_premium);
  const t = { t1: Number(trade.t1_premium), t2: Number(trade.t2_premium), t3: Number(trade.t3_premium) };
  let trailSl = Number(trade.trail_sl);
  let targetsHit = trade.targets_hit;

  if (Number.isFinite(premium) && premium > 0) {
    const maxP = Math.max(Number(trade.max_premium ?? entry), premium);
    const minP = Math.min(Number(trade.min_premium ?? entry), premium);

    // targets ratchet the stop — banked progress stops being returnable
    if (targetsHit < 1 && maxP >= t.t1) { targetsHit = 1; trailSl = Math.max(trailSl, entry); }
    if (targetsHit < 2 && maxP >= t.t2) { targetsHit = 2; trailSl = Math.max(trailSl, t.t1); }
    if (targetsHit < 3 && maxP >= t.t3) targetsHit = 3;

    // 1R breakeven ratchet + 1.5R profit trail: once the premium has been 1R
    // in favour the trade can no longer turn into a loss (stop to entry +
    // costs, ~₹1.05/unit at 2 lots), and from there the stop follows the
    // high-water mark 1.5R behind — profit trails continuously, not only at
    // target lines. 1.5R was measured, not chosen: 1R cuts the runners that
    // make the money (4y −₹1.4L), 2R never binds; 1.5R is neutral-to-positive
    // on both the year (+₹10k) and 4 years (+₹6k, smaller drawdown).
    const oneR = entry - Number(trade.sl_premium);
    if (oneR > 0 && maxP >= entry + oneR) {
      trailSl = Math.max(trailSl,
        Number((entry + 1.05).toFixed(2)),
        Number((maxP - oneR * 1.5).toFixed(2)));
    }

    const trailLifted = trailSl > Number(trade.trail_sl);
    await trade.update({ last_premium: premium, max_premium: maxP, min_premium: minP, trail_sl: trailSl, targets_hit: targetsHit });
    if (trailLifted) await execution.onTrailMoved(trade, trailSl).catch(() => {});

    if (targetsHit >= 3) {
      return resolve(trade, 'target', Math.min(premium, t.t3), `T3 ₹${t.t3} reached (all targets done)`);
    }
    if (premium <= trailSl) {
      const kind = trailSl > Number(trade.sl_premium) ? `trailing stop ₹${trailSl} (after T${targetsHit})` : `stop ₹${trailSl}`;
      return resolve(trade, 'stopped', trailSl, `premium hit ${kind}`);
    }
  }

  // wall integrity: the stop was BUILT on this level — if spot has broken it,
  // the structure is gone even before the premium prints the stop
  const ulSl = trade.ul_levels?.sl;
  if (ctx.spot != null && ulSl != null && trade.ul_levels?.basis === 'option-chain') {
    const buffer = ctx.spot * 0.0004;   // ~10 pts: a close breach, not a tick wick
    const broken = trade.direction === 'BUY' ? ctx.spot < ulSl - buffer : ctx.spot > ulSl + buffer;
    if (broken) {
      return resolve(trade, 'stopped', Number.isFinite(premium) ? premium : Number(trade.last_premium),
        `NIFTY ${Math.round(ctx.spot)} broke the ${trade.direction === 'BUY' ? 'support' : 'resistance'} wall ${ulSl} the stop was built on`);
    }
  }

  // thesis reversal: opposite side at gate conviction is an exit, not a debate
  if (ctx.oppositeConviction != null && ctx.oppositeConviction >= GATE) {
    return resolve(trade, 'invalidated', Number.isFinite(premium) ? premium : Number(trade.last_premium),
      `analysis reversed: opposite side at ${ctx.oppositeConviction}% (gate ${GATE}%)`);
  }

  if (istMinutes(nowSec) >= EXIT_CUTOFF_MIN) {
    return resolve(trade, 'eod', Number.isFinite(premium) ? premium : Number(trade.last_premium),
      'session close 15:20 — no overnight carry');
  }

  return trade;
}

/**
 * The card's honest status line — professional calm, but only where the data
 * earns it.
 */
function describe(trade, currentAnalysisDirection) {
  if (!trade) return null;
  const entry = Number(trade.entry_premium);
  const last = Number(trade.last_premium ?? entry);
  const trailSl = Number(trade.trail_sl);
  const pnlPerUnit = Number((last - entry).toFixed(2));

  if (trade.status !== 'active') {
    return { state: trade.status.toUpperCase(), line: trade.resolve_reason, pnlPerUnit: Number((Number(trade.exit_premium ?? last) - entry).toFixed(2)) };
  }

  const riskLeft = last - trailSl;
  const originalRisk = entry - Number(trade.sl_premium);
  let line;
  if (trade.targets_hit >= 2) {
    line = `T1 and T2 done — stop trails at ₹${trailSl} (T1). Worst case from here is banked profit; letting it run at T3 ₹${trade.t3_premium}.`;
  } else if (trade.targets_hit === 1) {
    line = `T1 done — stop trails at entry ₹${entry}. This trade can no longer lose; next level T2 ₹${trade.t2_premium}.`;
  } else if (last >= entry) {
    line = `In profit ₹${pnlPerUnit}/unit. Levels unchanged: stop ₹${trailSl}, first target ₹${trade.t1_premium}.`;
  } else if (riskLeft > originalRisk * 0.35) {
    line = `In drawdown ₹${Math.abs(pnlPerUnit)}/unit — but the ${trade.ul_levels?.basis === 'option-chain' ? `wall at ${trade.ul_levels.sl} is intact` : 'stop is not threatened'}. The trade stands on its levels: stop ₹${trailSl}, target ₹${trade.t1_premium}. Hold.`;
  } else {
    line = `Deep drawdown ₹${Math.abs(pnlPerUnit)}/unit — within ₹${riskLeft.toFixed(0)} of the stop ₹${trailSl}. Levels still hold, but this is the edge of the trade; the stop is the exit, not hope.`;
  }
  if (currentAnalysisDirection && currentAnalysisDirection !== 'NEUTRAL' && currentAnalysisDirection !== trade.direction) {
    line += ' Note: the live analysis currently leans the other way below gate conviction — watched, not acted on.';
  } else if (currentAnalysisDirection === 'NEUTRAL') {
    line += ' Entry conditions have faded to neutral — normal mid-trade; exits are governed by the levels, not the mood.';
  }
  return {
    state: 'ACTIVE',
    substate: trade.targets_hit > 0 ? `T${trade.targets_hit} hit` : (last >= entry ? 'in profit' : 'drawdown'),
    pnlPerUnit,
    line,
  };
}

async function recentTrades(limit = 10) {
  return Method2Trade.findAll({ where: { status: { [Op.ne]: 'active' } }, order: [['exit_time', 'DESC']], limit });
}

/**
 * Light heartbeat for the global screen effects (confetti on targets, red
 * flash on stops): the active trade's target count and the latest resolved
 * trade — two indexed reads, cheap enough to poll from every open page.
 */
async function tradePulse() {
  const active = await getActive();
  const last = await Method2Trade.findOne({
    where: { status: { [Op.ne]: 'active' } },
    order: [['exit_time', 'DESC']],
  });
  return {
    active: active ? {
      id: active.id, targetsHit: active.targets_hit,
      direction: active.direction, tradingsymbol: active.tradingsymbol, strike: active.strike,
      entry: Number(active.entry_premium),
      last: active.last_premium != null ? Number(active.last_premium) : null,
      trailSl: Number(active.trail_sl), t1: Number(active.t1_premium),
    } : null,
    last: last ? {
      id: last.id, outcome: last.status,
      entry: Number(last.entry_premium),
      exit: last.exit_premium != null ? Number(last.exit_premium) : null,
      exitTime: last.exit_time,
    } : null,
  };
}

/**
 * Every trade whose entry_time is on or after today's local midnight, newest
 * first — the autotrade panel's "today" ledger. Model access stays in the
 * service that owns Method2Trade; the controller does the P&L shaping.
 */
async function todaysTrades() {
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  return Method2Trade.findAll({ where: { entry_time: { [Op.gte]: dayStart } }, order: [['id', 'DESC']] });
}

/**
 * Every closed trade with a recorded exit premium, oldest first — the day
 * book groups these into per-day P&L.
 */
async function closedTradesWithExit() {
  return Method2Trade.findAll({
    where: { status: { [Op.ne]: 'active' }, exit_premium: { [Op.ne]: null } },
    order: [['exit_time', 'ASC']],
  });
}

module.exports = {
  getActive, openTrade, evaluateActive, describe, recentTrades, tradePulse,
  todaysTrades, closedTradesWithExit, GATE,
};
