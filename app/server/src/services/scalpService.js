'use strict';

/**
 * Scalp engine — "small volatile range" mean-reversion.
 *
 * A different approach from Method 2. Method 2 wants a TREND and rides it.
 * This wants the opposite regime: price rattling inside a tight band, going
 * nowhere. In that regime the edge is fading the extremes — buy CE when price
 * is pinned to the floor of the band, buy PE at the ceiling — and taking a
 * couple of premium points off the bounce rather than waiting for a move.
 *
 * Trade shape (fixed by spec):
 *   +2 premium points target, -5 premium points stop, 2 NIFTY lots (130 qty),
 *   entry premium capped at MAX_ENTRY_PREMIUM.
 *
 * NOTE ON THE ODDS: risking 5 to make 2 needs a 71.4% raw win rate just to
 * break even, and ~83% once Zerodha's charges are paid at the current entry
 * cap (see estimateCosts — the cap matters because charges scale with premium
 * turnover). That is the bar this strategy has to clear. runScalpBacktest
 * reports the required rate next to the achieved rate so the two are never
 * confused.
 */

const logger = require('@startup/logger');
const { fetchHistoricalCandles } = require('./broker');
const {
  IST, istMinutes, isMarketOpen, isNearClose,
  bsPrice, dteYears, atmStrike, optSymbol,
} = require('../utils/optionMath');

// ---------------------------------------------------------------------------
// Trade parameters
// ---------------------------------------------------------------------------

const LOT_SIZE           = 65;    // NIFTY contract size
const LOTS               = 2;
const QTY                = LOT_SIZE * LOTS;   // 130
const TARGET_PTS         = 2;     // premium points of profit
const STOP_PTS           = 5;     // premium points of loss
const MAX_ENTRY_PREMIUM  = 250;   // never pay more than this for the option
const MAX_HOLD_MINUTES   = 15;    // a scalp that has not resolved is a mistake
const STRIKE_STEP        = 50;

/**
 * Circuit breaker — stop trading for the day after this many stops in a row.
 * Not part of the original spec, but a strategy that can fire dozens of times
 * a day at -Rs.720 a stop needs a brake. The earlier engine in this repo used
 * the same idea. Pass { maxConsecutiveStops: 0 } to disable.
 */
const MAX_CONSECUTIVE_STOPS = 3;

/**
 * Points of slippage paid on EACH side (crossing the bid-ask).
 * On a 2-point target this is the single most important assumption in the
 * whole model, so runScalpBacktest re-runs the results across a sweep of it.
 */
const DEFAULT_SLIPPAGE_PTS = 0.25;

// ---------------------------------------------------------------------------
// Regime detection — is this a small, volatile, going-nowhere range?
// ---------------------------------------------------------------------------

const REGIME = {
  WINDOW:          20,      // candles of history to judge the regime on
  MAX_EFFICIENCY:  0.35,    // Kaufman ER above this = it is trending, not ranging
  MIN_RANGE_PCT:   0.0008,  // band narrower than this is dead, not volatile
  MAX_RANGE_PCT:   0.0035,  // band wider than this is not a "small" range
  MIN_PATH_RATIO:  1.6,     // price must traverse the band 1.6x+ = genuinely volatile
  EDGE_ZONE:       0.25,    // enter only in the bottom/top quarter of the band
};

/**
 * High-selectivity variant: outer 12% of the band only, decisively
 * non-trending, well-oscillated windows. Roughly a quarter of the trades of
 * the base config at a measurably higher win rate; pairs with the OI-flow
 * confirmation for the strictest entries.
 */
const REGIME_STRICT = { ...REGIME, EDGE_ZONE: 0.12, MAX_EFFICIENCY: 0.22, MIN_PATH_RATIO: 2.2 };

/**
 * Kaufman Efficiency Ratio: net movement divided by total path walked.
 * ~1.0 = a clean straight trend. ~0.0 = pure noise going nowhere.
 * A small volatile range is precisely "low ER, long path".
 */
function efficiencyRatio(closes) {
  if (closes.length < 2) return 1;
  let path = 0;
  for (let i = 1; i < closes.length; i++) path += Math.abs(closes[i] - closes[i - 1]);
  if (path === 0) return 0;   // nothing moved: dead, not trending
  return Math.abs(closes[closes.length - 1] - closes[0]) / path;
}

/**
 * Classifies the last REGIME.WINDOW candles.
 *
 * Returns { inRange, direction, ... } where direction is the scalp to take:
 * price sitting at the floor of the band → BUY CE, at the ceiling → BUY PE,
 * mid-band → null (no edge, the bounce could go either way).
 */
function detectRangeRegime(window, price, cfg = REGIME) {
  if (!Array.isArray(window) || window.length < cfg.WINDOW) {
    return { inRange: false, direction: null, reason: 'not enough candles' };
  }

  const highs  = window.map(c => c.high);
  const lows   = window.map(c => c.low);
  const closes = window.map(c => c.close);

  const bandHigh = Math.max(...highs);
  const bandLow  = Math.min(...lows);
  const bandPts  = bandHigh - bandLow;
  const rangePct = bandPts / price;

  let path = 0;
  for (let i = 1; i < closes.length; i++) path += Math.abs(closes[i] - closes[i - 1]);
  const pathRatio = bandPts > 0 ? path / bandPts : 0;
  const er        = efficiencyRatio(closes);

  // Where in the band are we right now? 0 = floor, 1 = ceiling.
  const position = bandPts > 0 ? (price - bandLow) / bandPts : 0.5;

  const metrics = {
    bandHigh:   Number(bandHigh.toFixed(2)),
    bandLow:    Number(bandLow.toFixed(2)),
    bandPts:    Number(bandPts.toFixed(2)),
    rangePct:   Number((rangePct * 100).toFixed(3)),
    efficiency: Number(er.toFixed(3)),
    pathRatio:  Number(pathRatio.toFixed(2)),
    position:   Number(position.toFixed(3)),
  };

  // ── Gate 1: must not be trending ──────────────────────────────────────────
  if (er > cfg.MAX_EFFICIENCY) {
    return { inRange: false, direction: null, metrics,
      reason: `Efficiency ${er.toFixed(2)} > ${cfg.MAX_EFFICIENCY} — price is trending, not ranging` };
  }

  // ── Gate 2: the band must be small, but not flatlined ─────────────────────
  if (rangePct > cfg.MAX_RANGE_PCT) {
    return { inRange: false, direction: null, metrics,
      reason: `Band ${(rangePct * 100).toFixed(2)}% is too wide for a 2-point scalp` };
  }
  if (rangePct < cfg.MIN_RANGE_PCT) {
    return { inRange: false, direction: null, metrics,
      reason: `Band ${(rangePct * 100).toFixed(2)}% is flat — no movement to scalp` };
  }

  // ── Gate 3: volatile — price has to actually work the band ────────────────
  if (pathRatio < cfg.MIN_PATH_RATIO) {
    return { inRange: false, direction: null, metrics,
      reason: `Path ratio ${pathRatio.toFixed(1)}x < ${cfg.MIN_PATH_RATIO}x — drifting, not oscillating` };
  }

  // ── Gate 4: not a breakout ────────────────────────────────────────────────
  // price is the CURRENT close judged against the PRECEDING window, so it can
  // sit outside the band. Fading a price that has just broken out is the exact
  // opposite of this strategy — the range is over, not being respected.
  if (position < -0.1 || position > 1.1) {
    return { inRange: false, direction: null, metrics,
      reason: `Price has broken out of the band (${(position * 100).toFixed(0)}%) — range is no longer holding` };
  }

  // ── Direction: fade the edge we are standing on ───────────────────────────
  let direction = null;
  if      (position <= cfg.EDGE_ZONE)     direction = 'BUY';   // at the floor → CE
  else if (position >= 1 - cfg.EDGE_ZONE) direction = 'SELL';  // at the ceiling → PE

  if (!direction) {
    return { inRange: true, direction: null, metrics,
      reason: `Mid-band (${(position * 100).toFixed(0)}%) — wait for price to reach an edge` };
  }

  return {
    inRange: true,
    direction,
    metrics,
    reason: direction === 'BUY'
      ? `At range floor (${(position * 100).toFixed(0)}% of band) — fading the low`
      : `At range ceiling (${(position * 100).toFixed(0)}% of band) — fading the high`,
  };
}

// ---------------------------------------------------------------------------
// Strike selection — nearest strike priced at or under the premium cap
// ---------------------------------------------------------------------------

/**
 * Walks OTM from ATM until the option costs <= MAX_ENTRY_PREMIUM.
 * Staying as close to ATM as the cap allows keeps delta (and therefore the
 * chance of moving 2 points quickly) as high as possible.
 */
function selectStrike(optType, spot, T, vol, maxPremium = MAX_ENTRY_PREMIUM) {
  let K = atmStrike(spot);
  for (let step = 0; step < 20; step++) {
    const premium = bsPrice(optType, spot, K, T, vol);
    if (premium <= maxPremium) return { strike: K, premium };
    // CE gets cheaper going up, PE going down
    K += optType === 'CE' ? STRIKE_STEP : -STRIKE_STEP;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Costs — Zerodha F&O option buying, one full round trip
// ---------------------------------------------------------------------------

/**
 * STT, exchange charges and stamp duty all scale with premium turnover, so the
 * round trip gets MORE expensive as the entry cap rises: ~Rs.70 at a 100-rupee
 * premium, ~Rs.108 at 250. Costs are why the breakeven win rate for +2/-5 sits
 * in the low 80s instead of the geometric 71.4%.
 */
function estimateCosts(entryPrem, exitPrem, qty = QTY) {
  const buyTurnover  = entryPrem * qty;
  const sellTurnover = exitPrem  * qty;
  const turnover     = buyTurnover + sellTurnover;

  const brokerage = 20 * 2;                    // Rs.20 per executed order, flat
  const stt       = sellTurnover * 0.001;      // 0.1%, sell side only
  const exchange  = turnover     * 0.0003503;  // NSE F&O premium turnover
  const sebi      = turnover     * 0.000001;   // Rs.10 per crore
  const stamp     = buyTurnover  * 0.00003;    // 0.003%, buy side only
  const gst       = (brokerage + exchange + sebi) * 0.18;

  const total = brokerage + stt + exchange + sebi + stamp + gst;
  return Number(total.toFixed(2));
}

/**
 * Win rate needed to break even IF every trade exits cleanly at the target or
 * the stop. Useful for sizing a shape before running it — but trades that time
 * out exit at market, so the realised average win can be far below the target.
 * Compare against `requiredWinRate` in a backtest result, which is derived from
 * what actually got filled and is the number that decides profitability.
 */
function breakevenWinRate(slippagePts = DEFAULT_SLIPPAGE_PTS,
                          refPremium = MAX_ENTRY_PREMIUM * 0.9,
                          targetPts = TARGET_PTS, stopPts = STOP_PTS) {
  const grossWin  = targetPts * QTY;
  const grossLoss = stopPts   * QTY;
  const slip      = slippagePts * 2 * QTY;                       // both sides
  const costWin   = estimateCosts(refPremium, refPremium + targetPts);
  const costLoss  = estimateCosts(refPremium, refPremium - stopPts);

  const netWin  = grossWin  - slip - costWin;
  const netLoss = grossLoss + slip + costLoss;
  if (netWin <= 0) return { breakeven: null, netWin, netLoss, note: 'target does not cover costs' };

  return {
    breakeven: Number((netLoss / (netLoss + netWin) * 100).toFixed(1)),
    netWin:    Number(netWin.toFixed(0)),
    netLoss:   Number(netLoss.toFixed(0)),
  };
}

// ---------------------------------------------------------------------------
// Live signal
// ---------------------------------------------------------------------------

/**
 * Builds the ladder of strikes worth quoting: ATM plus a few steps OTM, which
 * is where anything under the premium cap will be.
 */
function candidateStrikes(optType, spot, steps = 8) {
  const out = [];
  let K = atmStrike(spot);
  for (let n = 0; n < steps; n++) {
    out.push(K);
    K += optType === 'CE' ? STRIKE_STEP : -STRIKE_STEP;
  }
  return out;
}

/**
 * Picks the priciest strike still at or under the cap, using REAL quotes.
 * Closest to the cap means closest to ATM, which means the most delta — the
 * best chance of covering 2 points before theta and the spread eat the trade.
 */
function selectStrikeFromQuotes(quotes, maxPremium = MAX_ENTRY_PREMIUM) {
  let best = null;
  for (const q of quotes) {
    if (!q || !Number.isFinite(q.ltp) || q.ltp <= 0) continue;
    if (q.ltp > maxPremium) continue;
    if (!best || q.ltp > best.ltp) best = q;
  }
  return best;
}

/**
 * Evaluates the current market for a scalp. `candles` should be 1-minute bars,
 * newest last. Returns the regime read plus a concrete order card when the
 * conditions line up.
 *
 * Pass `opts.quoteFn` (symbols -> { symbol: { ltp } }) to price the strike off
 * the REAL option chain. The premium cap is a live-money constraint, so it has
 * to be checked against a real quote — the Black-Scholes fallback is only for
 * backtests and for when the chain is unreachable.
 */
async function evaluateScalp(candles, opts = {}) {
  const vol = opts.vol ?? 0.15;
  const regimeCfg  = opts.regimeCfg ?? REGIME;
  const targetPts  = opts.targetPts ?? TARGET_PTS;
  const stopPts    = opts.stopPts ?? STOP_PTS;
  if (!Array.isArray(candles) || candles.length < REGIME.WINDOW) {
    return { tradable: false, reason: 'Not enough 1-minute history yet', regime: null };
  }

  const last  = candles[candles.length - 1];
  const price = last.close;
  const now   = opts.now ?? last.time;

  if (!isMarketOpen(now)) {
    return { tradable: false, reason: 'Outside 9:15-15:00 trading window', regime: null };
  }
  if (isNearClose(now)) {
    return { tradable: false, reason: 'Too close to 15:10 — no time for the trade to resolve', regime: null };
  }

  const window = candles.slice(-REGIME.WINDOW);
  const regime = detectRangeRegime(window, price, regimeCfg);

  if (!regime.inRange || !regime.direction) {
    return { tradable: false, reason: regime.reason, regime };
  }

  const optType = regime.direction === 'BUY' ? 'CE' : 'PE';
  const T       = dteYears(now);

  // Prefer real quotes; fall back to Black-Scholes only if the chain is unreachable.
  let pick = null, pricedFrom = 'black-scholes';
  if (typeof opts.quoteFn === 'function') {
    try {
      // Candidate contracts. Prefer opts.strikeCandidatesFn, which resolves
      // REAL tradingsymbols (e.g. from the nfo_instruments snapshot). The
      // optSymbol fallback assumes Thursday weekly expiries — NSE has moved
      // NIFTY weeklies to Tuesday, so fabricated symbols can simply not exist
      // and every quote for them comes back empty.
      let cands;
      if (typeof opts.strikeCandidatesFn === 'function') {
        cands = await opts.strikeCandidatesFn(optType, price);
      }
      if (!Array.isArray(cands) || cands.length === 0) {
        cands = candidateStrikes(optType, price).map(K => ({
          strike: K, tradingsymbol: optSymbol(K, optType, now),
        }));
      }
      const symbols = cands.map(c => c.tradingsymbol);
      const quoteMap = await opts.quoteFn(symbols);
      const quoted = cands.map(c => ({
        strike: c.strike,
        tradingsymbol: c.tradingsymbol,
        ltp: quoteMap?.[c.tradingsymbol]?.ltp,
      }));
      const best = selectStrikeFromQuotes(quoted);
      if (best) {
        pick = { strike: best.strike, premium: best.ltp, tradingsymbol: best.tradingsymbol };
        pricedFrom = 'live-quote';
      } else if (quoted.some(q => Number.isFinite(q.ltp))) {
        // The chain answered, and nothing was cheap enough. That is a real
        // no-trade, not a reason to fall back to a friendlier model price.
        return { tradable: false, regime,
          reason: `No ${optType} strike quoted at or under ${MAX_ENTRY_PREMIUM} — cheapest is above the cap` };
      }
    } catch (err) {
      logger.error(`[scalp] quote lookup failed, falling back to model price: ${err.message}`);
    }
  }

  if (!pick) {
    const modelled = selectStrike(optType, price, T, vol);
    if (!modelled) {
      return { tradable: false, reason: `No ${optType} strike priced at or under ${MAX_ENTRY_PREMIUM}`, regime };
    }
    pick = { ...modelled, tradingsymbol: optSymbol(modelled.strike, optType, now) };
  }

  const entry = pick.premium;
  return {
    tradable:      true,
    reason:        regime.reason,
    regime,
    direction:     regime.direction,
    optType,
    strike:        pick.strike,
    tradingsymbol: pick.tradingsymbol,
    pricedFrom,
    qty:           QTY,
    lots:          LOTS,
    entryPremium:  Number(entry.toFixed(2)),
    targetPremium: Number((entry + targetPts).toFixed(2)),
    stopPremium:   Number((entry - stopPts).toFixed(2)),
    targetPts, stopPts,
    targetRs:      targetPts * QTY,
    riskRs:        stopPts   * QTY,
    maxHoldMins:   MAX_HOLD_MINUTES,
    breakeven:     breakevenWinRate(),
  };
}

// ---------------------------------------------------------------------------
// Backtest
// ---------------------------------------------------------------------------

const CHUNK_DAYS = 55; // Zerodha caps 1-minute history at 60 days per request

async function fetchMinuteCandles(symbol, fromUnix, toUnix) {
  const chunks = [];
  let end = toUnix;
  while (end > fromUnix) {
    const start = Math.max(fromUnix, end - CHUNK_DAYS * 24 * 3600);
    chunks.unshift({ from: start, to: end });
    end = start - 1;
  }

  const all = [];
  for (const chunk of chunks) {
    logger.info(`[scalp] Fetching 1-min ${new Date(chunk.from * 1000).toISOString().slice(0, 10)} → ${new Date(chunk.to * 1000).toISOString().slice(0, 10)}`);
    all.push(...await fetchHistoricalCandles(symbol, chunk.from, chunk.to, 'minute'));
    await new Promise(r => setTimeout(r, 350));
  }

  const seen = new Set();
  return all
    .filter(c => { if (seen.has(c.time)) return false; seen.add(c.time); return true; })
    .sort((a, b) => a.time - b.time);
}

/**
 * Infers bar size from the most common gap between consecutive candles.
 * Guards against running a 2-point scalp model on bars far coarser than the
 * trade it is meant to measure without anyone noticing.
 */
function inferStepSecs(candles) {
  const counts = new Map();
  for (let i = 1; i < Math.min(candles.length, 2000); i++) {
    const d = candles[i].time - candles[i - 1].time;
    if (d > 0 && d <= 3600) counts.set(d, (counts.get(d) ?? 0) + 1);
  }
  let best = 60, bestN = 0;
  for (const [d, n] of counts) if (n > bestN) { best = d; bestN = n; }
  return best;
}

/** Rolling 20-day annualised vol, indexed by candle position. */
function buildVolSeries(candles) {
  const dailyCloses = [];
  let lastDay = null;
  for (let i = 0; i < candles.length; i++) {
    const m   = istMinutes(candles[i].time);
    const day = Math.floor((candles[i].time + IST) / 86400);
    if (m >= 895 && day !== lastDay) {
      dailyCloses.push({ idx: i, close: candles[i].close });
      lastDay = day;
    }
  }
  return function volAt(candleIdx) {
    let d = dailyCloses.length - 1;
    while (d >= 0 && dailyCloses[d].idx > candleIdx) d--;
    const slice = dailyCloses.slice(Math.max(0, d - 20), d + 1);
    if (slice.length < 3) return 0.15;
    const rets = [];
    for (let j = 1; j < slice.length; j++) rets.push(Math.log(slice[j].close / slice[j - 1].close));
    const mean = rets.reduce((s, r) => s + r, 0) / rets.length;
    const varc = rets.reduce((s, r) => s + (r - mean) ** 2, 0) / rets.length;
    return Math.max(0.10, Math.min(0.60, Math.sqrt(varc * 252)));
  };
}

/**
 * Walks 1-minute candles, taking every scalp the regime filter allows.
 *
 * Fill model, deliberately pessimistic:
 *   - entry on the NEXT candle's open, never the signal candle's close
 *   - premium extremes within a candle come from the SPOT extremes repriced
 *     through Black-Scholes (a CE peaks at the candle high, a PE at the low)
 *   - if a single candle could have hit BOTH the stop and the target, it is
 *     recorded as a STOP. Intraday sequence is unknowable from OHLC, and
 *     assuming the good fill is how backtests lie.
 */
async function runScalpBacktest(symbol = 'NIFTY', opts = {}) {
  const days         = opts.days ?? 90;
  const slippagePts  = opts.slippagePts ?? DEFAULT_SLIPPAGE_PTS;
  const maxConsecStops = opts.maxConsecutiveStops ?? MAX_CONSECUTIVE_STOPS;
  // Diagnostic only. When a single bar could have hit BOTH the stop and the
  // target, OHLC cannot say which came first. Default records a stop (honest
  // for live trading). Flipping it brackets how much the bar resolution — not
  // the strategy — is driving the answer. The truth lies between the two runs.
  const optimisticTies = opts.optimisticTies === true;
  const targetPts = opts.targetPts ?? TARGET_PTS;
  const stopPts   = opts.stopPts   ?? STOP_PTS;
  /**
   * A/B control. Bypasses the regime filter and takes a coin-flip direction on
   * a fixed cadence, keeping every other mechanic identical. If the real filter
   * cannot beat this, the filter is not adding information and the approach is
   * not worth tuning. Deterministic, so runs are reproducible.
   */
  const bypassRegime = opts.bypassRegime === true;
  /**
   * Bars between the signal and the fill. 1 (default) models an order placed on
   * the next bar's open — honest for an automated system reacting to a closed
   * bar. 0 models filling at the signal bar's close, which is what a human
   * watching the tape does. On a 2-point target the difference is large, and on
   * 5-minute bars "one bar late" means up to five minutes late.
   */
  const entryDelayBars = opts.entryDelayBars ?? 1;
  let seed = 12345;
  const rand = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const toUnix       = Math.floor(Date.now() / 1000);
  const fromUnix     = toUnix - days * 24 * 3600;

  // Candles may be injected (cached history) rather than fetched.
  const candles = opts.candles ?? await fetchMinuteCandles(symbol, fromUnix, toUnix);

  // Bar size drives every time calculation below. Inferred from the data so a
  // 5-minute cache cannot be silently treated as 1-minute bars.
  const stepSecs = opts.stepSecs ?? inferStepSecs(candles);
  const barMins  = stepSecs / 60;
  const maxHoldMins    = opts.maxHoldMinutes ?? MAX_HOLD_MINUTES;
  // Minutes-of-day (IST) at which any open trade is force-closed — no carry
  // to the next session. Default keeps the historical 15:10 behaviour; pass
  // 920 for a 15:20 cutoff. Entries are still gated by isNearClose above.
  const exitCutoffMin  = opts.exitCutoffMin ?? (15 * 60 + 10);
  const maxHoldCandles = Math.max(1, Math.round(maxHoldMins / barMins));
  logger.info(`[scalp] ${candles.length} candles @ ${barMins}-min bars (hold <= ${maxHoldCandles} bars)`);
  if (candles.length < REGIME.WINDOW + 10) {
    throw new Error(`Not enough candles returned (${candles.length})`);
  }

  const volAt  = buildVolSeries(candles);
  const trades = [];

  // Circuit-breaker state, reset at every session boundary
  let curDay = null, consecStops = 0, haltedDays = 0, halted = false;
  let ambiguousBars = 0;   // bars where stop and target were both reachable

  let i = REGIME.WINDOW;
  while (i < candles.length - 2) {
    const cur = candles[i];

    if (!isMarketOpen(cur.time) || isNearClose(cur.time)) { i++; continue; }

    const day = Math.floor((cur.time + IST) / 86400);
    if (day !== curDay) {
      curDay = day; consecStops = 0;
      if (halted) haltedDays++;
      halted = false;
    }
    if (halted) { i++; continue; }

    const window = candles.slice(i - REGIME.WINDOW, i);
    // Window must be one contiguous session, or the "range" spans an overnight gap
    if (window[0].time !== cur.time - REGIME.WINDOW * stepSecs) { i++; continue; }

    let regime;
    if (bypassRegime) {
      regime = { inRange: true, direction: rand() < 0.5 ? 'BUY' : 'SELL',
                 metrics: { bandPts: 0, efficiency: 0 }, reason: 'control: random entry' };
    } else {
      regime = detectRangeRegime(window, cur.close);
      if (!regime.inRange || !regime.direction) { i++; continue; }
    }

    const entryIdx    = i + entryDelayBars;
    const entryCandle = candles[entryIdx];
    if (!entryCandle || entryCandle.time !== cur.time + entryDelayBars * stepSecs) { i++; continue; }

    const optType   = regime.direction === 'BUY' ? 'CE' : 'PE';
    const entrySpot = entryDelayBars === 0 ? entryCandle.close : entryCandle.open;
    const entryDow  = new Date((cur.time + IST) * 1000).getUTCDay();
    const vol       = volAt(i);
    const T0        = dteYears(entryCandle.time, entryDow);

    const pick = selectStrike(optType, entrySpot, T0, vol);
    if (!pick) { i++; continue; }

    const K         = pick.strike;
    const entryPrem = pick.premium + slippagePts;   // pay up to get filled
    const targetPrem = pick.premium + targetPts;
    const stopPrem   = pick.premium - stopPts;

    // ── Walk forward minute by minute ──────────────────────────────────────
    // Filling at a bar's OPEN means that same bar's range is still ahead of us,
    // so it can resolve the trade. Filling at a bar's CLOSE means it cannot —
    // start scanning from the next bar.
    const scanStart = entryDelayBars === 0 ? entryIdx + 1 : entryIdx;
    let outcome = 'timeout', exitPrem = entryPrem, exitIdx = scanStart;
    const holdEnd = Math.min(scanStart + maxHoldCandles, candles.length);

    for (let k = scanStart; k < holdEnd; k++) {
      const ec = candles[k];
      if (ec.time !== entryCandle.time + (k - entryIdx) * stepSecs) { break; } // session broke
      const T  = dteYears(ec.time, entryDow);

      // A CE is worth most at the candle's high, a PE at its low.
      const premAtHigh = bsPrice(optType, ec.high, K, T, vol);
      const premAtLow  = bsPrice(optType, ec.low,  K, T, vol);
      const premMax    = Math.max(premAtHigh, premAtLow);
      const premMin    = Math.min(premAtHigh, premAtLow);

      exitIdx  = k;
      exitPrem = bsPrice(optType, ec.close, K, T, vol);

      const hitStop   = premMin <= stopPrem;
      const hitTarget = premMax >= targetPrem;
      if (hitStop && hitTarget) ambiguousBars++;

      if (hitStop && !(optimisticTies && hitTarget)) {
        outcome = 'loss'; exitPrem = stopPrem; break;
      }
      if (hitTarget) { outcome = 'win'; exitPrem = targetPrem; break; }
      if (istMinutes(ec.time) >= exitCutoffMin) { outcome = 'timeout'; break; }
    }

    if (outcome === 'loss') {
      consecStops++;
      if (maxConsecStops > 0 && consecStops >= maxConsecStops) halted = true;
    } else if (outcome === 'win') {
      consecStops = 0;
    }

    const exitFill = exitPrem - slippagePts;               // give up the spread again
    const gross    = (exitFill - entryPrem) * QTY;
    const costs    = estimateCosts(entryPrem, exitFill);
    const net      = gross - costs;

    trades.push({
      date:          new Date((cur.time + IST) * 1000).toISOString().slice(0, 10),
      time:          new Date((cur.time + IST) * 1000).toISOString().slice(11, 16),
      direction:     regime.direction,
      optType,
      strike:        K,
      tradingsymbol: optSymbol(K, optType, entryCandle.time),
      spot:          Math.round(entrySpot),
      entryPrem:     Number(entryPrem.toFixed(2)),
      targetPrem:    Number(targetPrem.toFixed(2)),
      stopPrem:      Number(stopPrem.toFixed(2)),
      exitPrem:      Number(exitFill.toFixed(2)),
      heldMins:      (exitIdx - entryIdx) * barMins,
      outcome,
      grossRs:       Math.round(gross),
      costsRs:       Math.round(costs),
      netRs:         Math.round(net),
      bandPts:       regime.metrics.bandPts,
      efficiency:    regime.metrics.efficiency,
    });

    i = exitIdx + 1;   // no overlapping positions
  }

  // ── Stats ────────────────────────────────────────────────────────────────
  const wins     = trades.filter(t => t.netRs > 0);
  const losses   = trades.filter(t => t.netRs <= 0);
  const timeouts = trades.filter(t => t.outcome === 'timeout');
  const grossWin  = wins.reduce((s, t) => s + t.netRs, 0);
  const grossLoss = losses.reduce((s, t) => s + Math.abs(t.netRs), 0);

  let peak = 0, maxDd = 0, equity = 0;
  for (const t of trades) {
    equity += t.netRs;
    if (equity > peak) peak = equity;
    if (peak - equity > maxDd) maxDd = peak - equity;
  }

  const targetHits = trades.filter(t => t.outcome === 'win').length;
  const be         = breakevenWinRate(slippagePts, MAX_ENTRY_PREMIUM * 0.9, targetPts, stopPts);
  const winRate    = trades.length ? Number((wins.length / trades.length * 100).toFixed(1)) : 0;

  // The authoritative bar: built from the average win and loss ACTUALLY
  // realised, so timeouts and partial fills are already priced in.
  const avgWin  = wins.length   ? grossWin  / wins.length   : 0;
  const avgLoss = losses.length ? grossLoss / losses.length : 0;
  const requiredWinRate = (avgWin > 0 && avgLoss > 0)
    ? Number((avgLoss / (avgLoss + avgWin) * 100).toFixed(1))
    : null;

  return {
    symbol,
    days,
    slippagePts,
    barMinutes: barMins,
    entryDelayBars,
    bypassRegime,
    optimisticTies,
    // How often the bar was too coarse to resolve the trade. High = the fill
    // assumption, not the edge, is deciding the result.
    ambiguousBars,
    params: { targetPts, stopPts, qty: QTY, lots: LOTS, maxEntryPremium: MAX_ENTRY_PREMIUM, maxHoldMins, maxConsecutiveStops: maxConsecStops },
    daysHaltedByCircuitBreaker: haltedDays,
    totalTrades:   trades.length,
    wins:          wins.length,
    losses:        losses.length,
    targetHits,
    stopHits:      trades.filter(t => t.outcome === 'loss').length,
    timeouts:      timeouts.length,
    winRate,
    // Required rate given the realised avg win/loss — the number that decides
    // viability. Profitable exactly when winRate exceeds it (i.e. PF > 1).
    requiredWinRate,
    edgePts: requiredWinRate != null ? Number((winRate - requiredWinRate).toFixed(1)) : null,
    profitable: requiredWinRate != null && winRate > requiredWinRate,
    // Planning figure only: assumes every exit is a clean target/stop fill.
    theoreticalBreakevenWinRate: be.breakeven,
    netPnlRs:      Math.round(trades.reduce((s, t) => s + t.netRs, 0)),
    totalCostsRs:  Math.round(trades.reduce((s, t) => s + t.costsRs, 0)),
    avgWinRs:      wins.length   ? Math.round(grossWin  / wins.length)   : 0,
    avgLossRs:     losses.length ? Math.round(grossLoss / losses.length) : 0,
    profitFactor:  grossLoss > 0 ? Number((grossWin / grossLoss).toFixed(2)) : null,
    maxDrawdownRs: Math.round(maxDd),
    avgHoldMins:   trades.length ? Number((trades.reduce((s, t) => s + t.heldMins, 0) / trades.length).toFixed(1)) : 0,
    trades:        trades.slice(-200).reverse(),
  };
}

module.exports = {
  detectRangeRegime,
  efficiencyRatio,
  selectStrike,
  selectStrikeFromQuotes,
  candidateStrikes,
  estimateCosts,
  breakevenWinRate,
  evaluateScalp,
  runScalpBacktest,
  REGIME,
  REGIME_STRICT,
  MAX_CONSECUTIVE_STOPS,
  QTY,
  TARGET_PTS,
  STOP_PTS,
  MAX_ENTRY_PREMIUM,
};
