'use strict';

/**
 * Auto-execution of Method 2 trades on the user's own Zerodha account —
 * built at the account owner's explicit request, for their personal trading.
 *
 * The cage comes before the trades:
 *  - OFF by default. Three modes persisted in app_settings: off | dry | live.
 *    Dry-run records every order it WOULD place, so fills can be compared
 *    against the paper ledger for days before a rupee moves.
 *  - Hard cap 2 lots (130 qty) — a code constant, not a setting.
 *  - Product MIS: if this machine dies mid-trade the broker itself squares
 *    off before close. The stop ALSO lives on the exchange as a resting SL
 *    order (SL-M is not permitted for options), lifted as the system trails —
 *    a crashed server cannot lose the stop.
 *  - One executed position at a time; entries only in market hours; circuit
 *    breaker: 3 stopped trades in a day = no new entries that day.
 *  - Every action and every failure is an auto_orders row. Execution errors
 *    never break the signal lifecycle — the ledger stays truthful even when
 *    the broker misbehaves.
 */

const { Op } = require('sequelize');
const logger = require('@startup/logger');
// One-model-per-service is violated here (AutoOrder primary, plus AppSetting
// and Method2Trade) — carried over verbatim from the live-order source. See
// MIGRATION FINDINGS: route AppSetting -> appSettingService and
// Method2Trade -> method2TradeService when those services land.
const { AutoOrder, AppSetting, Method2Trade } = require('../models');
const broker = require('@appServer/interfaces/broker');
const { isMarketOpen } = require('../utils/optionMath');

const QTY = 130;                 // 2 lots of 65 — the user's stated hard ceiling
const PRODUCT = 'MIS';
const EXCHANGE = 'NFO';
const MAX_STOPS_PER_DAY = 3;
const MAX_TRADES_PER_DAY = 10;   // hard daily ceiling on executed entries
const SWITCH_KEY = 'auto_trade_mode';

let modeCache = { at: 0, mode: 'off' };

function kite() {
  // Single shared authed-client factory on the broker interface; credentials
  // come from Company Settings (Company Profile → trading), hot-reloaded.
  return broker.buildKite();
}

async function getMode() {
  if (Date.now() - modeCache.at < 30 * 1000) {
    return modeCache.mode;
  }
  let mode = 'off';
  try {
    const row = await AppSetting.findByPk(SWITCH_KEY);
    if (['off', 'dry', 'live'].includes(row?.value?.mode)) {
      mode = row.value.mode;
    }
  } catch { /* unreadable switch = OFF */ }
  modeCache = { at: Date.now(), mode };
  return mode;
}

async function setMode(mode) {
  if (!['off', 'dry', 'live'].includes(mode)) {
    throw new Error(`bad mode ${mode}`);
  }
  await AppSetting.upsert({ key: SWITCH_KEY, value: { mode } });
  modeCache = { at: Date.now(), mode };
  logger.info(`[autotrade] mode set to ${mode.toUpperCase()}`);
  return mode;
}

async function audit(row) {
  try {
    return await AutoOrder.create(row);
  } catch (e) {
    logger.error(`[autotrade] audit write failed: ${e.message}`, e); return null;
  }
}

const tick = (p) => +(Math.max(0.05, Math.round(p / 0.05) * 0.05)).toFixed(2);
// SL orders for options must be SL (limit): the limit sits under the trigger
// so a fast move still fills the exit
const slLimit = (trigger) => tick(trigger - Math.max(1, trigger * 0.03));
// Zerodha refuses plain MARKET option orders via API ("market protection").
// A marketable LIMIT is the sanctioned equivalent: priced through the spread
// (2% + ₹0.50 past LTP) it fills instantly on ATM NIFTY strikes while capping
// slippage at a level a MARKET order never guaranteed anyway.
const marketableBuy = (ltp) => tick(ltp * 1.02 + 0.5);
const marketableSell = (ltp) => tick(Math.max(0.05, ltp * 0.98 - 0.5));
async function ltpOf(k, tradingsymbol) {
  const q = await k.getLTP(`NFO:${tradingsymbol}`);
  const v = q?.[`NFO:${tradingsymbol}`]?.last_price;
  if (!(v > 0)) {
    throw new Error(`no LTP for ${tradingsymbol}`);
  }
  return Number(v);
}

function dayStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

async function stopsToday() {
  return Method2Trade.count({ where: { status: 'stopped', exit_time: { [Op.gte]: dayStart() } } });
}

async function entriesToday() {
  return AutoOrder.count({ where: { kind: 'entry', status: { [Op.in]: ['dry', 'placed'] }, created_at: { [Op.gte]: dayStart() } } });
}

/** One call answers the live-trading screen: mode, limits, today's counts. */
async function dayStatus() {
  const [mode, trades, stops] = await Promise.all([getMode(), entriesToday(), stopsToday()]);
  return {
    mode, qty: QTY,
    tradesToday: trades, maxTradesDay: MAX_TRADES_PER_DAY,
    stopsToday: stops, maxStopsDay: MAX_STOPS_PER_DAY,
    blocked: trades >= MAX_TRADES_PER_DAY ? 'daily trade cap reached'
      : stops >= MAX_STOPS_PER_DAY ? 'circuit breaker (stops)' : null
  };
}

/** After a trade row is created: entry order + resting exchange SL. */
async function onTradeOpened(trade) {
  const mode = await getMode();
  if (mode === 'off') {
    return;
  }
  const base = { trade_id: trade.id, mode, tradingsymbol: trade.tradingsymbol, qty: QTY };
  try {
    if (!isMarketOpen(Math.floor(Date.now() / 1000))) {
      throw new Error(`market closed — refused`);
    }
    if ((await stopsToday()) >= MAX_STOPS_PER_DAY) {
      throw new Error(`circuit breaker: ${MAX_STOPS_PER_DAY} stops today — refused`);
    }
    if ((await entriesToday()) >= MAX_TRADES_PER_DAY) {
      throw new Error(`daily cap: ${MAX_TRADES_PER_DAY} executed trades today — refused`);
    }
    const dupe = await AutoOrder.findOne({ where: { trade_id: trade.id, kind: 'entry', status: { [Op.in]: ['dry', 'placed'] } } });
    if (dupe) {
      throw new Error(`entry already executed for this trade — refused`);
    }

    if (mode === 'dry') {
      await audit({ ...base, kind: 'entry', transaction: 'BUY', order_type: 'MARKET', status: 'dry',
        detail: `would BUY ${QTY} @ MARKET (paper entry ₹${trade.entry_premium})` });
      await audit({ ...base, kind: 'sl', transaction: 'SELL', order_type: 'SL', status: 'dry',
        trigger_price: tick(Number(trade.trail_sl)), limit_price: slLimit(Number(trade.trail_sl)),
        detail: `would rest SL trigger ₹${tick(Number(trade.trail_sl))}` });
      return;
    }

    const k = kite();
    const ltp = await ltpOf(k, trade.tradingsymbol);
    const buyPrice = marketableBuy(ltp);
    const entry = await k.placeOrder('regular', {
      exchange: EXCHANGE, tradingsymbol: trade.tradingsymbol,
      transaction_type: 'BUY', quantity: QTY, product: PRODUCT, order_type: 'LIMIT', price: buyPrice
    });
    await audit({ ...base, kind: 'entry', transaction: 'BUY', order_type: 'LIMIT', limit_price: buyPrice,
      broker_order_id: String(entry?.order_id ?? entry), status: 'placed', detail: `live entry — marketable limit ${buyPrice} (ltp ${ltp})` });

    // WAIT FOR THE FILL before resting the stop: a SELL against a not-yet-
    // filled buy margins as a naked short (₹3.5L!) and gets rejected —
    // learned live, trade 12. If the fill outlasts this wait, the
    // ensureStopResting repair places the stop on a later poll.
    const entryId = String(entry?.order_id ?? entry);
    let filled = false;
    for (let i = 0; i < 10 && !filled; i++) {
      await new Promise(r => setTimeout(r, 1000));
      try {
        const os = await k.getOrders();
        const o = os.find(x => String(x.order_id) === entryId);
        if (o && ['REJECTED', 'CANCELLED'].includes(o.status)) {
          await audit({ ...base, kind: 'sl', transaction: 'SELL', order_type: 'SL', status: 'cancelled',
            detail: `entry ${o.status} at broker — no position, no stop needed` });
          return;
        }
        filled = o?.status === 'COMPLETE';
      } catch { /* transient read failure — keep waiting */ }
    }
    if (!filled) {
      await audit({ ...base, kind: 'sl', transaction: 'SELL', order_type: 'SL', status: 'error',
        detail: 'entry not COMPLETE within 10s — stop will be placed by the resting-stop repair' });
      return;
    }

    const trig = tick(Number(trade.trail_sl));
    const sl = await k.placeOrder('regular', {
      exchange: EXCHANGE, tradingsymbol: trade.tradingsymbol,
      transaction_type: 'SELL', quantity: QTY, product: PRODUCT, order_type: 'SL',
      trigger_price: trig, price: slLimit(trig)
    });
    await audit({ ...base, kind: 'sl', transaction: 'SELL', order_type: 'SL',
      trigger_price: trig, limit_price: slLimit(trig),
      broker_order_id: String(sl?.order_id ?? sl), status: 'placed', detail: 'resting stop on exchange' });
  } catch (e) {
    logger.error(`[autotrade] entry failed for trade ${trade.id}: ${e.message}`, e);
    await audit({ ...base, kind: 'entry', transaction: 'BUY', order_type: 'MARKET', status: 'error',
      detail: String(e.message).slice(0, 380) });
  }
}

/** When the lifecycle lifts the trail: lift the resting exchange SL too. */
async function onTrailMoved(trade, newSl) {
  const mode = await getMode();
  if (mode === 'off') {
    return;
  }
  const base = { trade_id: trade.id, mode, tradingsymbol: trade.tradingsymbol, qty: QTY };
  try {
    const trig = tick(Number(newSl));
    const slRow = await AutoOrder.findOne({
      where: { trade_id: trade.id, kind: { [Op.in]: ['sl', 'sl-modify'] }, status: { [Op.in]: ['placed', 'modified'] } },
      order: [['id', 'DESC']]
    });
    if (mode === 'dry' || !slRow?.broker_order_id) {
      await audit({ ...base, kind: 'sl-modify', transaction: 'SELL', order_type: 'SL', status: 'dry',
        trigger_price: trig, limit_price: slLimit(trig), detail: `would lift SL to ₹${trig}` });
      return;
    }
    await kite().modifyOrder('regular', slRow.broker_order_id, { trigger_price: trig, price: slLimit(trig) });
    await audit({ ...base, kind: 'sl-modify', transaction: 'SELL', order_type: 'SL', status: 'modified',
      trigger_price: trig, limit_price: slLimit(trig), broker_order_id: slRow.broker_order_id, detail: 'stop lifted' });
  } catch (e) {
    logger.error(`[autotrade] SL modify failed for trade ${trade.id}: ${e.message}`, e);
    await audit({ ...base, kind: 'sl-modify', transaction: 'SELL', order_type: 'SL', status: 'error',
      detail: String(e.message).slice(0, 380) });
  }
}

/** When the lifecycle resolves: cancel the resting SL and go flat. */
async function onTradeResolved(trade, outcome) {
  const mode = await getMode();
  if (mode === 'off') {
    return;
  }
  const base = { trade_id: trade.id, mode, tradingsymbol: trade.tradingsymbol, qty: QTY };
  try {
    if (mode === 'dry') {
      await audit({ ...base, kind: 'exit', transaction: 'SELL', order_type: 'MARKET', status: 'dry',
        detail: `would flatten on '${outcome}' (cancel SL, SELL ${QTY} @ MARKET)` });
      return;
    }
    const k = kite();
    const slRow = await AutoOrder.findOne({
      where: { trade_id: trade.id, kind: { [Op.in]: ['sl', 'sl-modify'] }, status: { [Op.in]: ['placed', 'modified'] } },
      order: [['id', 'DESC']]
    });
    // the exchange SL may already have fired — never sell what is not held
    let slFilled = false;
    if (slRow?.broker_order_id && outcome === 'stopped') {
      try {
        const orders = await k.getOrders();
        const o = orders.find(x => String(x.order_id) === String(slRow.broker_order_id));
        slFilled = o?.status === 'COMPLETE';
      } catch { /* fall through to the position check */ }
    }
    if (slRow?.broker_order_id && !slFilled) {
      try {
        await k.cancelOrder('regular', slRow.broker_order_id);
        await audit({ ...base, kind: 'cancel', transaction: 'SELL', order_type: 'SL', status: 'cancelled',
          broker_order_id: slRow.broker_order_id, detail: 'SL cancelled before exit' });
      } catch (e) {
        await audit({ ...base, kind: 'cancel', transaction: 'SELL', order_type: 'SL', status: 'error',
          detail: String(e.message).slice(0, 380) });
      }
    }
    const positions = await k.getPositions();
    const pos = positions?.net?.find(p => p.tradingsymbol === trade.tradingsymbol && p.product === PRODUCT);
    const held = pos ? Number(pos.quantity) : 0;
    if (held > 0) {
      const ltp = await ltpOf(k, trade.tradingsymbol).catch(() => Number(trade.last_premium) || 1);
      const sellPrice = marketableSell(ltp);
      const exit = await k.placeOrder('regular', {
        exchange: EXCHANGE, tradingsymbol: trade.tradingsymbol,
        transaction_type: 'SELL', quantity: Math.min(held, QTY), product: PRODUCT, order_type: 'LIMIT', price: sellPrice
      });
      await audit({ ...base, kind: 'exit', transaction: 'SELL', order_type: 'LIMIT', qty: Math.min(held, QTY), limit_price: sellPrice,
        broker_order_id: String(exit?.order_id ?? exit), status: 'placed', detail: `flattened on '${outcome}' — marketable limit ${sellPrice} (ltp ${ltp})` });
    } else {
      await audit({ ...base, kind: 'exit', transaction: 'SELL', order_type: 'MARKET', status: 'cancelled',
        detail: `no ${PRODUCT} position held — already flat ('${outcome}')` });
    }
  } catch (e) {
    logger.error(`[autotrade] exit failed for trade ${trade.id}: ${e.message}`, e);
    await audit({ ...base, kind: 'exit', transaction: 'SELL', order_type: 'MARKET', status: 'error',
      detail: String(e.message).slice(0, 380) });
  }
}

async function recentOrders(limit = 30) {
  return AutoOrder.findAll({ order: [['id', 'DESC']], limit });
}

// Today's Method 2 trade rows — the inline query the legacy autotrade-state
// endpoint ran against Method2Trade, relocated into the service that already
// owns that model (keeps model access out of the controller/view layer).
async function todaysTrades() {
  return Method2Trade.findAll({ where: { entry_time: { [Op.gte]: dayStart() } }, order: [['id', 'DESC']] });
}

// Self-repair: a held MIS position with NO stop resting on the exchange is
// exactly the unprotected state this whole design exists to prevent (seen
// live: SL rejected in the fill race, position naked until the next fix).
// Every poll, if we hold the trade's contract and no SELL stop is open,
// place one at the current trail level. Throttled to one check a minute.
let lastSlEnsureAt = 0;
async function ensureStopResting(trade) {
  try {
    if ((await getMode()) !== 'live') {
      return;
    }
    if (Date.now() - lastSlEnsureAt < 60 * 1000) {
      return;
    }
    lastSlEnsureAt = Date.now();
    const k = kite();
    const positions = await k.getPositions();
    const pos = positions?.net?.find(p => p.tradingsymbol === trade.tradingsymbol && p.product === PRODUCT && Number(p.quantity) > 0);
    if (!pos) {
      return;
    }
    const orders = await k.getOrders();
    const resting = orders.find(o => o.tradingsymbol === trade.tradingsymbol && o.transaction_type === 'SELL'
      && ['OPEN', 'TRIGGER PENDING'].includes(o.status) && ['SL', 'SL-M'].includes(o.order_type));
    if (resting) {
      return;
    }
    const trig = tick(Number(trade.trail_sl));
    const qty = Math.min(Number(pos.quantity), QTY);
    const sl = await k.placeOrder('regular', {
      exchange: EXCHANGE, tradingsymbol: trade.tradingsymbol,
      transaction_type: 'SELL', quantity: qty, product: PRODUCT, order_type: 'SL',
      trigger_price: trig, price: slLimit(trig)
    });
    await audit({ trade_id: trade.id, kind: 'sl', mode: 'live', tradingsymbol: trade.tradingsymbol,
      transaction: 'SELL', qty, order_type: 'SL', trigger_price: trig, limit_price: slLimit(trig),
      broker_order_id: String(sl?.order_id ?? sl), status: 'placed',
      detail: 'stop restored — position was held with no stop resting' });
    logger.info(`[autotrade] restored missing resting stop for trade ${trade.id} at ${trig}`);
  } catch (e) {
    logger.error(`[autotrade] ensureStopResting failed: ${e.message}`, e);
  }
}

// Automatic catch-up — built at the account owner's explicit, repeated
// instruction ("it should be automatic"). Every poll, if the active ledger
// trade never reached the account, the trade's own side STILL clears the
// 70% gate right now, and the premium is inside the chase cap, the entry
// fires through the normal caged path. Attempt throttle: one try per 3
// minutes, at most 3 broker attempts per trade — a refused order must
// never become a retry storm.
let lastCatchUpAt = 0;
async function maybeCatchUpEntry(trade, sidePct) {
  try {
    if ((await getMode()) !== 'live') {
      return;
    }
    if (!(sidePct >= 70)) {
      return;
    }                                  // favourable NOW, not at entry time
    if (Date.now() - lastCatchUpAt < 3 * 60 * 1000) {
      return;
    }
    const attempts = await AutoOrder.count({ where: { trade_id: trade.id, kind: 'entry' } });
    if (attempts >= 6) {
      return;
    }   // 6, not 3: infra refusals (IP, order-type) burned attempts on day one
    lastCatchUpAt = Date.now();
    await catchUpEntry(trade);                                     // flat-account, chase-cap and cage guards inside
    logger.info(`[autotrade] catch-up entry fired for trade ${trade.id} (${trade.tradingsymbol}) at side ${sidePct}%`);
  } catch (e) {
    // normal refusals (already held, chase cap, market closed) stay quiet;
    // broker errors are already audit rows via onTradeOpened
  }
}

/**
 * Catch-up entry — fired ONLY by the user's explicit click on /live, for a
 * ledger trade whose entry never reached the account (refused entry, or a
 * trade opened before going live). The human judges favourability; the code
 * enforces the geometry: account must be flat on the contract, and the
 * premium must not have run past entry + 0.5R (chasing a runner re-prices
 * the whole plan). Then the normal entry path — with every cage guard and
 * the resting exchange SL — takes over.
 */
async function catchUpEntry(trade) {
  const mode = await getMode();
  if (mode !== 'live') {
    throw new Error(`auto-trade mode is ${mode} — arm LIVE first`);
  }
  const acct = await accountState(trade);
  if (!acct.ok) {
    throw new Error(`cannot read account: ${acct.error}`);
  }
  const held = acct.positions.find(p => p.tradingsymbol === trade.tradingsymbol && p.qty > 0);
  if (held) {
    throw new Error(`account already holds ${held.qty} of ${trade.tradingsymbol} (${held.product}) — nothing to catch up`);
  }
  const dupe = await AutoOrder.findOne({ where: { trade_id: trade.id, kind: 'entry', status: 'placed' } });
  if (dupe) {
    throw new Error(`a live entry was already placed for this trade`);
  }
  const entry = Number(trade.entry_premium);
  const oneR = entry - Number(trade.sl_premium);
  const ltp = Number(trade.last_premium) || entry;
  if (ltp > entry + oneR * 0.5) {
    throw new Error(`premium ₹${ltp.toFixed(2)} has run past the chase cap ₹${(entry + oneR * 0.5).toFixed(2)} (entry + 0.5R) — entering now would re-price the plan`);
  }
  await onTradeOpened(trade);
  const placed = await AutoOrder.findOne({ where: { trade_id: trade.id, kind: 'entry' }, order: [['id', 'DESC']] });
  if (placed?.status !== 'placed' && placed?.status !== 'dry') {
    throw new Error(placed?.detail ?? 'entry was refused — see audit');
  }
  return { ok: true, status: placed.status, detail: placed.detail };
}

// ── Account truth: what the Zerodha account ACTUALLY holds ────────────────
// The ledger can believe a trade is on while the account is flat (an entry
// refused by the broker) or the reverse (a manual trade). Reading positions
// back and comparing is the only honest answer to "am I really in?".
let acctCache = { at: 0, data: null };

async function accountState(activeTrade) {
  if (Date.now() - acctCache.at > 6000) {
    try {
      const k = kite();
      const [positions, gtts] = await Promise.all([
        k.getPositions(),
        k.getGTTs().catch(() => [])   // GTT read failing must not blank the panel
      ]);
      const open = (positions?.net ?? [])
        .filter(p => Number(p.quantity) !== 0)
        .map(p => ({
          tradingsymbol: p.tradingsymbol, exchange: p.exchange, product: p.product,
          qty: Number(p.quantity), avgPrice: Number(p.average_price),
          lastPrice: Number(p.last_price), pnl: Math.round(Number(p.pnl))
        }));
      // attach active GTT triggers to the position they guard: a two-leg
      // (OCO) GTT on a long option is [stoploss, target]; single-leg shows
      // as whichever side of the entry it sits on
      for (const p of open) {
        const g = (gtts ?? []).find(x => x.status === 'active' && x.condition?.tradingsymbol === p.tradingsymbol);
        if (g?.condition?.trigger_values?.length) {
          const vals = g.condition.trigger_values.map(Number).sort((a, b) => a - b);
          p.gtt = vals.length >= 2
            ? { sl: vals[0], target: vals[vals.length - 1], type: 'OCO' }
            : (vals[0] < p.avgPrice ? { sl: vals[0], target: null, type: 'single' }
              : { sl: null, target: vals[0], type: 'single' });
          p.gtt.id = g.id;
        }
      }
      acctCache = { at: Date.now(), data: { ok: true, positions: open } };
    } catch (e) {
      acctCache = { at: Date.now(), data: { ok: false, error: String(e.message ?? e).slice(0, 200), positions: [] } };
    }
  }
  const acct = acctCache.data;
  // Overlay the websocket's live LTP (sub-second) on the broker snapshot:
  // qty/avg only change on fills, but price and P&L should tick in realtime.
  if (acct.ok && acct.positions.length) {
    try {
      const tickerService = require('./tickerService');
      const bySymbol = new Map();
      for (const idx of ['NIFTY', 'BANKNIFTY']) {
        const chain = tickerService.getChain(idx);
        for (const row of chain.rows ?? []) {
          for (const side of ['CE', 'PE']) {
            const c = row[side];
            if (c?.tradingsymbol && c.ltp != null && (c.ageMs ?? 1e9) < 10000) {
              bySymbol.set(c.tradingsymbol, c.ltp);
            }
          }
        }
      }
      for (const p of acct.positions) {
        const live = bySymbol.get(p.tradingsymbol);
        if (live != null) {
          p.lastPrice = live;
          p.pnl = Math.round((live - p.avgPrice) * p.qty);
          p.live = true;
        }
      }
    } catch { /* ticker not available — broker snapshot stands */ }
  }
  let sync = 'flat';
  if (acct.ok) {
    const match = activeTrade ? acct.positions.find(p => p.tradingsymbol === activeTrade.tradingsymbol && p.qty > 0) : null;
    if (activeTrade && match) {
      sync = match.qty === QTY ? 'in-sync' : 'qty-mismatch';
    } else if (activeTrade && acct.positions.length === 0) {
      sync = 'paper-only';
    } else if (activeTrade) {
      sync = 'different-position';
    } else if (acct.positions.length > 0) {
      sync = 'account-only';
    }
    // suggest the system's CURRENT levels for the matching position's GTT:
    // the trailing stop (with every ratchet baked in) and the next uncleared
    // capped target. Suggestion only — applying is always the user's click.
    if (match && activeTrade) {
      const hit = activeTrade.targets_hit ?? 0;
      const tgt = hit >= 2 ? Number(activeTrade.t3_premium) : hit >= 1 ? Number(activeTrade.t2_premium) : Number(activeTrade.t1_premium);
      match.suggest = {
        sl: +Number(activeTrade.trail_sl).toFixed(2),
        target: +tgt.toFixed(2),
        basis: `system stop (1R BE + 1.5R trail) and T${hit + 1}`
      };
    }
  } else {
    sync = 'unknown';
  }
  return { ...acct, sync, checkedAt: acctCache.at };
}

/**
 * Modify the user's own GTT on a held position to the given SL/target —
 * called only from the UI's apply button, i.e. an explicit user choice.
 * Rebuilds the OCO with the same qty/product legs, new trigger values.
 */
async function modifyPositionGtt({ tradingsymbol, sl, target }) {
  sl = Number(sl); target = Number(target);
  if (!(sl > 0) || !(target > 0) || !(target > sl)) {
    throw new Error(`need 0 < SL < target`);
  }
  const k = kite();
  const gtts = await k.getGTTs();
  const g = (gtts ?? []).find(x => x.status === 'active' && x.condition?.tradingsymbol === tradingsymbol);
  if (!g) {
    throw new Error(`no active GTT found for ${tradingsymbol}`);
  }
  const leg = g.orders?.[0];
  const qty = Number(leg?.quantity) || QTY;
  const product = leg?.product || 'NRML';
  const lastPrice = Number(g.condition?.last_price) || (sl + target) / 2;
  await k.modifyGTT(g.id, {
    trigger_type: 'two-leg', exchange: 'NFO', tradingsymbol,
    trigger_values: [tick(sl), tick(target)],
    last_price: lastPrice,
    orders: [
      { transaction_type: 'SELL', quantity: qty, order_type: 'LIMIT', product, price: slLimit(tick(sl)) },
      { transaction_type: 'SELL', quantity: qty, order_type: 'LIMIT', product, price: tick(target) }
    ]
  });
  await audit({
    trade_id: 0, kind: 'gtt-modify', mode: await getMode(), tradingsymbol,
    transaction: 'SELL', qty, order_type: 'GTT', trigger_price: tick(sl), limit_price: tick(target),
    broker_order_id: String(g.id), status: 'modified',
    detail: `user applied suggested levels: SL ${tick(sl)} / target ${tick(target)}`
  });
  acctCache = { at: 0, data: acctCache.data };   // next read shows the new triggers
  return { id: g.id, sl: tick(sl), target: tick(target), qty, product };
}

module.exports = { getMode, setMode, onTradeOpened, onTrailMoved, onTradeResolved, recentOrders, todaysTrades, dayStatus, accountState, modifyPositionGtt, catchUpEntry, maybeCatchUpEntry, ensureStopResting, QTY };
