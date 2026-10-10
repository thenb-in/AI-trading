'use strict';

/**
 * Forward paper-trading recorder for the scalp engine.
 *
 * Runs every minute during market hours. It does two things, in order:
 *   1. marks any OPEN virtual position against the live quoted premium, and
 *      closes it on target / stop / time limit
 *   2. if nothing is open, evaluates the scalp signal and opens one
 *
 * Why this exists: a +2 premium target is smaller than the resolution of every
 * historical dataset in this project (5-minute index candles, and 2-minute
 * option snapshots of which ~63% repeat the previous LTP unchanged). Those can
 * neither confirm nor refute the live experience. Polling real quotes forward
 * can, and it records premium_best / premium_worst so we also learn how much
 * the trade moved BETWEEN polls.
 */

const { Op } = require('sequelize');
const logger = require('@startup/logger');
const { ScalpPaperTrade, NfoInstrument } = require('../models');
const { fetchHistoricalCandles, getOptionQuotesByTradingSymbols } = require('@appServer/interfaces/broker');
const {
  evaluateScalp, estimateCosts, QTY, REGIME_STRICT,
} = require('./scalpService');

/**
 * What the recorder is validating: the strictest configuration the historical
 * data supports — strict regime + option-chain (OI flow) confirmation at
 * +3/-5, the only shape that has tested profitable. 26-trade backtest samples
 * prove nothing on their own; this forward record is what will.
 */
const RECORD_CFG = { targetPts: 3, stopPts: 5, regimeCfg: REGIME_STRICT, flowWindowMin: 10 };

// Rolling per-symbol OI history from live quotes, for the flow computation.
// Map<tradingsymbol, Array<{t, oi}>> — trimmed to the last 20 minutes.
const oiHistory = new Map();

function recordOi(nowSec, quoteMap) {
  for (const [sym, q] of Object.entries(quoteMap ?? {})) {
    if (!Number.isFinite(q?.oi)) continue;
    const arr = oiHistory.get(sym) ?? [];
    arr.push({ t: nowSec, oi: q.oi });
    while (arr.length && arr[0].t < nowSec - 20 * 60) arr.shift();
    oiHistory.set(sym, arr);
  }
}

function oiAt(sym, t, tolSec = 90) {
  const arr = oiHistory.get(sym);
  if (!arr) return null;
  let best = null;
  for (const p of arr) if (Math.abs(p.t - t) <= tolSec && (!best || Math.abs(p.t - t) < Math.abs(best.t - t))) best = p;
  return best?.oi ?? null;
}

/**
 * Live OI flow: put writers adding at/below spot defend the floor (bullish),
 * call writers adding at/above spot cap the ceiling (bearish). Same rule the
 * backtest validated, fed by per-minute quote OI instead of candle OI.
 */
function liveOiFlow(nowSec, spot, candidates) {
  let peBelow = 0, ceAbove = 0, seen = 0;
  for (const c of candidates) {
    const now = oiAt(c.tradingsymbol, nowSec);
    const then = oiAt(c.tradingsymbol, nowSec - RECORD_CFG.flowWindowMin * 60);
    if (now == null || then == null) continue;
    const d = now - then;
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
const { isMarketOpen, isNearClose, istMinutes } = require('../utils/optionMath');

/**
 * No timeout on live positions: a trade is held until the target or the stop
 * is hit, and force-closed at 15:20 IST — nothing carries overnight.
 * MAX_HOLD_SECONDS applies ONLY to unquotable positions (broken symbol or a
 * dead chain), which cannot be marked and must not linger.
 */
const EXIT_CUTOFF_MIN  = 15 * 60 + 20;   // 15:20 IST
const MAX_HOLD_SECONDS = 15 * 60;

const pastCutoff = (nowSec) => istMinutes(nowSec) >= EXIT_CUTOFF_MIN;

/**
 * Real tradingsymbols for strikes near spot, from the daily nfo_instruments
 * snapshot — nearest expiry only. This is the authority on what contracts
 * actually exist; fabricating symbols from an assumed expiry weekday broke the
 * moment NSE moved NIFTY weeklies off Thursday.
 */
async function liveStrikeCandidates(optType, spot, symbol = 'NIFTY') {
  const today = new Date().toISOString().slice(0, 10);
  const latestSnap = await NfoInstrument.max('snapshot_date');
  if (!latestSnap) return [];
  const rows = await NfoInstrument.findAll({
    where: {
      snapshot_date: latestSnap,
      name: symbol,
      instrument_type: optType,
      expiry: { [Op.gte]: today },
      strike: { [Op.between]: [spot - 600, spot + 600] },
    },
    order: [['expiry', 'ASC'], ['strike', 'ASC']],
    raw: true,
  });
  if (rows.length === 0) return [];
  const nearest = rows[0].expiry;
  return rows.filter(r => r.expiry === nearest)
             .map(r => ({ strike: Number(r.strike), tradingsymbol: r.tradingsymbol }));
}

/** Marks an open position against a fresh quote and closes it if resolved. */
async function markOpenPosition(trade, nowSec) {
  const entry  = Number(trade.premium_entry);
  const target = Number(trade.premium_target);
  const stop   = Number(trade.premium_stop);
  const held   = nowSec - Math.floor(new Date(trade.entry_time).getTime() / 1000);

  const quotes = await getOptionQuotesByTradingSymbols([trade.tradingsymbol]);
  const ltp = quotes?.[trade.tradingsymbol]?.ltp;

  if (!Number.isFinite(ltp) || ltp <= 0) {
    // No quote — a nonexistent symbol, or the chain is down. This must NOT be
    // a silent no-op: without the escape below, an unquotable position stays
    // open forever, polls frozen at 0, and nobody finds out.
    logger.warn(`[scalpPaper] no quote for ${trade.tradingsymbol} (held ${held}s)`);
    if (held >= MAX_HOLD_SECONDS || pastCutoff(nowSec)) {
      const costs = estimateCosts(entry, entry, trade.qty);
      await trade.update({
        status: 'timeout',
        exit_time: new Date(nowSec * 1000),
        premium_exit: entry,
        gross_rs: '0.00',
        costs_rs: costs.toFixed(2),
        net_rs: (-costs).toFixed(2),
        held_seconds: held,
        reason: `${trade.reason ?? ''} | closed unquotable`.slice(0, 160),
      });
      logger.warn(`[scalpPaper] force-closed unquotable ${trade.tradingsymbol} as timeout`);
      return 'timeout';
    }
    return null;
  }

  const best  = trade.premium_best  == null ? ltp : Math.max(Number(trade.premium_best),  ltp);
  const worst = trade.premium_worst == null ? ltp : Math.min(Number(trade.premium_worst), ltp);

  let status = null, exitPrem = ltp;
  // Stop is checked first: if a single poll shows both breached, the honest
  // reading for live money is that the loss could have come first.
  if (ltp <= stop)              { status = 'loss'; exitPrem = ltp; }
  else if (ltp >= target)       { status = 'win';  exitPrem = ltp; }
  else if (pastCutoff(nowSec))  { status = 'eod';  exitPrem = ltp; }   // no carry

  if (!status) {
    await trade.update({ premium_best: best, premium_worst: worst, polls: (trade.polls ?? 0) + 1 });
    return null;
  }

  const gross = (exitPrem - entry) * trade.qty;
  const costs = estimateCosts(entry, exitPrem, trade.qty);
  await trade.update({
    status,
    exit_time:     new Date(nowSec * 1000),
    premium_exit:  exitPrem,
    premium_best:  best,
    premium_worst: worst,
    polls:         (trade.polls ?? 0) + 1,
    gross_rs:      gross.toFixed(2),
    costs_rs:      costs.toFixed(2),
    net_rs:        (gross - costs).toFixed(2),
    held_seconds:  held,
  });
  logger.info(`[scalpPaper] closed ${trade.tradingsymbol} ${status} entry=${entry} exit=${exitPrem} net=Rs.${(gross - costs).toFixed(0)}`);
  return status;
}

/** One minute of the recorder. Safe to call when the market is shut. */
async function tick(symbol = 'NIFTY') {
  const nowSec = Math.floor(Date.now() / 1000);
  if (!isMarketOpen(nowSec)) return { skipped: 'market closed' };

  // 1. Mark anything already open.
  const open = await ScalpPaperTrade.findAll({ where: { status: 'open' } });
  let closedThisTick = 0;
  for (const t of open) {
    try { if (await markOpenPosition(t, nowSec)) closedThisTick++; }
    catch (err) { logger.error(`[scalpPaper] mark failed: ${err.message}`); }
  }

  // One position at a time, matching how the backtest counts trades.
  const stillOpen = await ScalpPaperTrade.count({ where: { status: 'open' } });
  if (stillOpen > 0) return { marked: open.length, opened: 0 };

  // Never re-enter on the same tick that just closed a trade. Otherwise a win
  // immediately re-buys at the target price we just sold at, which is chasing,
  // and no backtest here models that.
  if (closedThisTick > 0) {
    return { marked: open.length, closed: closedThisTick, opened: 0, reason: 'cooldown after exit' };
  }
  if (isNearClose(nowSec)) return { marked: open.length, opened: 0, skipped: 'near close' };

  // 2. Look for a fresh signal.
  const candles = await fetchHistoricalCandles(symbol, nowSec - 3 * 3600, nowSec, 'minute');
  const spotNow = candles.length ? candles[candles.length - 1].close : null;

  // Pull the whole near-ATM chain once per tick: it feeds the OI history for
  // the flow gate AND serves as the quote source for strike selection.
  let chain = [], chainQuotes = {};
  if (Number.isFinite(spotNow)) {
    const [ce, pe] = await Promise.all([
      liveStrikeCandidates('CE', spotNow, symbol),
      liveStrikeCandidates('PE', spotNow, symbol),
    ]);
    chain = [
      ...ce.map(c => ({ ...c, type: 'CE' })),
      ...pe.map(c => ({ ...c, type: 'PE' })),
    ];
    if (chain.length) {
      chainQuotes = await getOptionQuotesByTradingSymbols(chain.map(c => c.tradingsymbol));
      recordOi(nowSec, chainQuotes);
    }
  }

  const signal  = await evaluateScalp(candles, {
    now: nowSec,
    ...RECORD_CFG,
    // serve quotes from the chain already fetched this tick; fall back to the
    // API only for symbols outside it
    quoteFn: async (symbols) => {
      if (symbols.every(sym => chainQuotes[sym])) return chainQuotes;
      return getOptionQuotesByTradingSymbols(symbols);
    },
    strikeCandidatesFn: (optType, spot) => liveStrikeCandidates(optType, spot, symbol),
  });
  // A modelled premium is not a tradable order card — without a real quote
  // there is nothing to mark the position against, so record nothing.
  if (signal.tradable && signal.pricedFrom !== 'live-quote') {
    return { marked: open.length, opened: 0, reason: 'signal present but no live quote — not recording' };
  }
  if (!signal.tradable) return { marked: open.length, opened: 0, reason: signal.reason };

  // ── Option-chain confirmation gate ─────────────────────────────────────
  const flow = liveOiFlow(nowSec, spotNow, chain);
  if (!flowAgrees(flow, signal.direction)) {
    return { marked: open.length, opened: 0,
      reason: `regime fired but OI flow disagrees (peBelow=${flow.peBelow}, ceAbove=${flow.ceAbove}, seen=${flow.seen})` };
  }

  const spot = candles.length ? candles[candles.length - 1].close : null;
  await ScalpPaperTrade.create({
    entry_time:     new Date(nowSec * 1000),
    status:         'open',
    direction:      signal.direction,
    option_type:    signal.optType,
    tradingsymbol:  signal.tradingsymbol,
    strike:         signal.strike,
    spot_entry:     spot,
    premium_entry:  signal.entryPremium,
    premium_target: signal.targetPremium,
    premium_stop:   signal.stopPremium,
    premium_best:   signal.entryPremium,
    premium_worst:  signal.entryPremium,
    qty:            signal.qty,
    regime:         { ...(signal.regime?.metrics ?? {}), flow, config: 'strict+OIflow +3/-5' },
    reason:         (signal.reason || '').slice(0, 160),
  });
  logger.info(`[scalpPaper] opened ${signal.tradingsymbol} @ ${signal.entryPremium} (${signal.pricedFrom})`);
  return { marked: open.length, opened: 1, tradingsymbol: signal.tradingsymbol };
}

/** Running scorecard, plus the bar the shape has to clear. */
async function getPaperStats() {
  const trades = await ScalpPaperTrade.findAll({
    where: { status: { [Op.ne]: 'open' } },
    order: [['entry_time', 'DESC']],
    limit: 500,
  });
  const openNow = await ScalpPaperTrade.findAll({ where: { status: 'open' } });

  const net  = t => Number(t.net_rs ?? 0);
  const wins = trades.filter(t => net(t) > 0);
  const loss = trades.filter(t => net(t) <= 0);
  const avgWin  = wins.length ? wins.reduce((s, t) => s + net(t), 0) / wins.length : 0;
  const avgLoss = loss.length ? Math.abs(loss.reduce((s, t) => s + net(t), 0) / loss.length) : 0;

  // How often the premium touched the target between polls but the position
  // was not closed there. If this is large, minute polling is too slow.
  const touchedTarget = trades.filter(t =>
    t.premium_best != null && Number(t.premium_best) >= Number(t.premium_target)).length;

  return {
    params: { targetPts: RECORD_CFG.targetPts, stopPts: RECORD_CFG.stopPts, qty: QTY, config: 'strict regime + OI-flow confirmation' },
    openPositions: openNow.length,
    closed:   trades.length,
    wins:     wins.length,
    losses:   loss.length,
    winRate:  trades.length ? Number((wins.length / trades.length * 100).toFixed(1)) : null,
    requiredWinRate: (avgWin > 0 && avgLoss > 0)
      ? Number((avgLoss / (avgLoss + avgWin) * 100).toFixed(1)) : null,
    grossRs:  Math.round(trades.reduce((s, t) => s + Number(t.gross_rs ?? 0), 0)),
    chargesRs: Math.round(trades.reduce((s, t) => s + Number(t.costs_rs ?? 0), 0)),
    netRs:    Math.round(trades.reduce((s, t) => s + net(t), 0)),   // in hand
    avgWinRs: Math.round(avgWin),
    avgLossRs: Math.round(avgLoss),
    everTouchedTarget: touchedTarget,
    byStatus: ['win', 'loss', 'eod', 'timeout'].map(s => ({ status: s, n: trades.filter(t => t.status === s).length })),
    recent:   trades.slice(0, 50),
    open:     openNow,
  };
}

module.exports = { tick, getPaperStats, liveStrikeCandidates, MAX_HOLD_SECONDS, RECORD_CFG };
