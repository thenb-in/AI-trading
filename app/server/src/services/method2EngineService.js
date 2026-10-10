'use strict';

/**
 * Method 2 — the 8-factor signal-synthesis engine (crown jewel), moved verbatim
 * out of the legacy index.js `/market/method2` route handler.
 *
 * Preserves EXACTLY: the three hard gates (session / ADX<20 / VIX>=22), the
 * MACD-contradiction gate, the 8-factor scoring with its exact weights, the
 * seasonal tilt, the MIN_DIRECTION_PCT=70 conviction floor, the option
 * recommendation + chain-based exit construction (with every "never again"
 * degenerate-chain guard), the reasons, the one-trade-at-a-time lifecycle
 * handoff to method2TradeService, and the 2s response cache.
 *
 * The only mechanical changes from source: req/res removed (the handler body
 * now RETURNS the response body; the view owns res + the 502 envelope), the 2s
 * cache lives here as module state so the pulse endpoint can read it, console
 * -> @startup/logger, and relocation into the layered structure.
 */

const logger = require('@startup/logger');
const { TradeSignal } = require('../models');
const {
  getMarketSnapshot, getIndiaVix, getNiftyCandles,
  calculateMacd, calculateAdx, calculateSuperTrend,
  breakoutState, evaluateMarketSession
} = require('./market_data');
const { getOiBasedSupportResistance, calculateMaxPain, getNiftyAtmOptionQuote } = require('@appServer/interfaces/broker');
const { getOiChangeAnalysis } = require('./optionSnapshotService');
const chainFeed = require('./chainFeedService');
const { liveTiltState } = require('./seasonalityService');
const m2trade = require('./method2TradeService');
const execution = require('./executionService');
const tickerService = require('./tickerService');
const { sendTradeSignalMail } = require('./tradeSignalMailService');

// ── Signal thresholds ────────────────────────────────────────────────────
// bearPct is defined as (100 - bullPct), so ANY threshold <= 50 makes NEUTRAL
// unreachable — one side always clears it and every poll emits a trade call.
// MIN_DIRECTION_PCT is the single conviction floor: it gates both the MACD
// contradiction check and the final direction, so nothing can reach the user
// without having been screened. 70, not 65: chosen by walk-forward validation
// (gate 70 selected in all ten train windows; out of sample it halved trade
// count and friction and turned the year from -74k to +219k).
const MIN_DIRECTION_PCT = 70;   // show on dashboard / open trades
const MIN_EMAIL_PCT     = 75;   // stricter bar before an alert leaves the box

// ── In-memory recommendation history (up to 200, newest first) ───────────
const recHistory = [];

// Track the last symbol an email was actually sent for, separately from the
// dedupe used for history/DB. Without this, a low-confidence signal can
// "poison" the slot and suppress the email when the same symbol later
// crosses the 75% threshold.
let lastEmailedSymbol = null;

function logRec(rec, direction, confidence, ind, pcr) {
  if (!rec || direction === 'NEUTRAL') {
    return;
  }

  // History/DB dedupe: same tradingsymbol means same active trade — skip the row.
  const last = recHistory[0];
  const sameAsLast = last && last.tradingsymbol === rec.tradingsymbol;
  if (sameAsLast) {
    // Even when the row is skipped, the email gate still has to run — the
    // symbol might just have crossed 75% since the last poll.
    maybeSendSignalEmail(rec, direction, confidence);
    return;
  }

  const entry = {
    timestamp:     new Date().toISOString(),
    direction,
    action:        rec.action,
    tradingsymbol: rec.tradingsymbol,
    optionType:    rec.optionType,
    strike:        rec.strike,
    expiry:        rec.expiry,
    spotPrice:     rec.spotPrice,
    premiumEntry:  rec.premiumEntry,
    premiumT1:     rec.premiumT1,
    premiumT2:     rec.premiumT2,
    premiumT3:     rec.premiumT3,
    premiumSL:     rec.premiumSL,
    ulSl:          rec.ulSl,
    ulT1:          rec.ulT1,
    ulT2:          rec.ulT2,
    confidence,
    ema20:         ind?.ema20 != null ? Math.round(ind.ema20)       : null,
    ema50:         ind?.ema50 != null ? Math.round(ind.ema50)       : null,
    rsi:           ind?.rsi   != null ? Number(ind.rsi.toFixed(1))  : null,
    pcr:           pcr?.pcr   != null ? Number(pcr.pcr.toFixed(2))  : null,
    reasons:       rec.reasons ?? []
  };

  recHistory.unshift(entry);
  if (recHistory.length > 200) {
    recHistory.pop();
  }

  // Persist to DB (non-blocking)
  TradeSignal.create({
    timestamp:     entry.timestamp,
    direction:     entry.direction,
    action:        entry.action,
    tradingsymbol: entry.tradingsymbol,
    option_type:   entry.optionType,
    strike:        entry.strike,
    expiry:        entry.expiry,
    spot_price:    entry.spotPrice,
    premium_entry: entry.premiumEntry,
    premium_sl:    entry.premiumSL,
    premium_t1:    entry.premiumT1,
    premium_t2:    entry.premiumT2,
    premium_t3:    entry.premiumT3,
    ul_sl:         entry.ulSl,
    ul_t1:         entry.ulT1,
    ul_t2:         entry.ulT2,
    confidence:    entry.confidence,
    ema20:         entry.ema20,
    ema50:         entry.ema50,
    rsi:           entry.rsi,
    pcr:           entry.pcr,
    reasons:       entry.reasons
  }).catch(err => logger.error(`[TradeSignal] DB save failed: ${err.message}`, err));

  maybeSendSignalEmail(rec, direction, confidence);
}

function maybeSendSignalEmail(rec, direction, confidence) {
  if (confidence < MIN_EMAIL_PCT) {
    logger.info(`[Mailer] Skipping email — confidence ${confidence}% < ${MIN_EMAIL_PCT}% (signal still shown on UI)`);
    return;
  }
  if (lastEmailedSymbol === rec.tradingsymbol) {
    // Same trade already alerted — don't repeat the email while it's still active.
    return;
  }
  lastEmailedSymbol = rec.tradingsymbol;
  sendTradeSignalMail(rec, direction, confidence).catch(() => {});
}

// Load last 200 signals from DB into memory on startup
async function loadSignalHistory() {
  try {
    const { Op } = require('sequelize');
    // Only recent history belongs on the dashboard. Without this filter the
    // full table loads on boot — months-old signals (from since-changed logic)
    // reappear looking current, labelled as this session's output.
    const rows = await TradeSignal.findAll({
      where: { timestamp: { [Op.gte]: new Date(Date.now() - 7 * 24 * 3600 * 1000) } },
      order: [['timestamp', 'DESC']],
      limit: 200
    });
    for (const row of rows) {
      recHistory.push({
        timestamp:    row.timestamp,
        direction:    row.direction,
        action:       row.action,
        tradingsymbol:row.tradingsymbol,
        optionType:   row.option_type,
        strike:       row.strike,
        expiry:       row.expiry,
        spotPrice:    row.spot_price != null ? Number(row.spot_price) : null,
        premiumEntry: row.premium_entry != null ? Number(row.premium_entry) : null,
        premiumSL:    row.premium_sl   != null ? Number(row.premium_sl)    : null,
        premiumT1:    row.premium_t1   != null ? Number(row.premium_t1)    : null,
        premiumT2:    row.premium_t2   != null ? Number(row.premium_t2)    : null,
        premiumT3:    row.premium_t3   != null ? Number(row.premium_t3)    : null,
        ulSl:         row.ul_sl,
        ulT1:         row.ul_t1,
        ulT2:         row.ul_t2,
        confidence:   row.confidence,
        ema20:        row.ema20 != null ? Number(row.ema20) : null,
        ema50:        row.ema50 != null ? Number(row.ema50) : null,
        rsi:          row.rsi   != null ? Number(row.rsi)   : null,
        pcr:          row.pcr   != null ? Number(row.pcr)   : null,
        reasons:      row.reasons ?? []
      });
    }
    logger.info(`[TradeSignal] Loaded ${rows.length} signals from DB`);
  } catch (err) {
    logger.error(`[TradeSignal] Failed to load history: ${err.message}`, err);
  }
}

// ── 2s response cache (shared with the pulse endpoint) ───────────────────
// The freshest the analysis can honestly recompute without crowding Zerodha's
// ~1 req/s REST budget that the executor also lives on. Only successful bodies
// are cached (computeMethod2 throws on failure, which the view maps to 502).
let m2Cache = { body: null, at: 0 };

async function computeMethod2() {
  const [snapR, oiChangeR, oiSrR, maxPainR, vixR, ceR, peR, candlesR] = await Promise.allSettled([
    getMarketSnapshot(),
    getOiChangeAnalysis(),
    getOiBasedSupportResistance(),
    calculateMaxPain(),
    getIndiaVix(),
    getNiftyAtmOptionQuote('CE'),
    getNiftyAtmOptionQuote('PE'),
    getNiftyCandles()          // for MACD / ADX / SuperTrend / ATR
  ]);

  const snap      = snapR.status      === 'fulfilled' ? snapR.value      : null;

  // OI analysis input: the live per-minute chain feed. The old
  // option_snapshots path (proven ~63% stale) is only a fallback while
  // the feed warms up, and is labelled as such.
  const spotForFeed = snap?.spotPrice ?? snap?.price ?? null;
  const feed = chainFeed.analyze(spotForFeed);
  const oiChange = feed.ready
    ? feed
    : (oiChangeR.status === 'fulfilled'
      ? { ...oiChangeR.value, source: 'stale-snapshots', feedWarmup: feed.reason }
      : { overallBias: 'neutral', changes: [], source: 'none', feedWarmup: feed.reason });
  const oiSr      = oiSrR.status      === 'fulfilled' ? oiSrR.value      : null;
  const maxPain   = maxPainR.status   === 'fulfilled' ? maxPainR.value   : null;
  const vix       = vixR.status       === 'fulfilled' ? vixR.value       : null;
  const ceQuote   = ceR.status        === 'fulfilled' ? ceR.value        : null;
  const peQuote   = peR.status        === 'fulfilled' ? peR.value        : null;
  const candleData= candlesR.status   === 'fulfilled' ? candlesR.value   : null;
  const session   = evaluateMarketSession();
  const ind       = snap?.indicators  ?? null;
  const price     = snap?.niftyPrice?.lastPrice ?? null;

  // ── Compute momentum indicators from real candle data ─────────────────
  const candles     = candleData?.candles ?? [];
  const macdResult  = candles.length >= 26 ? calculateMacd(candles)       : null;
  const adxState    = candles.length >= 15 ? calculateAdx(candles)        : null;
  const stResult    = candles.length >= 10 ? calculateSuperTrend(candles) : null;

  // Live Method-1 breakout read on the same candle window
  let breakout = { sig: 0, ready: false };
  try {
    breakout = breakoutState(candles);
  } catch { /* optional signal */ }

  // ATR: average of last 10 candle ranges (for dynamic SL sizing)
  let atr = null;
  if (candles.length >= 5) {
    const recent = candles.slice(-14);
    atr = recent.reduce((s, c) => s + (c.high - c.low), 0) / recent.length;
  }

  // ── GATE 1: Session check ─────────────────────────────────────────────
  // No trade outside normal trading hours (pre/post market, lunch dead zone)
  if (!session.allowed) {
    const vixVal0 = vix?.vixValue ?? null;
    return ({
      direction: 'NEUTRAL', confidence: 50, bullPct: 50, bearPct: 50,
      recommendation: null, noTradeReason: `Session: ${session.reason}`,
      price, indicators: ind, pcr: (typeof feed !== 'undefined' && feed.ready) ? feed.pcr : (snap?.pcr ?? null),
      oiChange, oiSr, maxPain,
      vix: { value: vixVal0, safe: vixVal0 == null || vixVal0 < 20 },
      session, ceQuote, peQuote, livePremiums: {}, history: recHistory,
      adx: adxState, macd: macdResult ? { crossover: macdResult.crossover, histogram: macdResult.histogramDirection } : null,
      supertrend: stResult ? stResult.direction : null
    });
  }

  // ── GATE 2: ADX — no trade in choppy, directionless markets ──────────
  // ADX below 20 means the market is not trending. Option buyers need a
  // clear directional move; entering in chop = guaranteed theta bleed.
  const adxValue = adxState?.adx ?? null;
  if (adxValue != null && adxValue < 20) {
    const vixVal0 = vix?.vixValue ?? null;
    return ({
      direction: 'NEUTRAL', confidence: 50, bullPct: 50, bearPct: 50,
      recommendation: null, noTradeReason: `ADX ${adxValue.toFixed(1)} < 20 — market is choppy, no directional trend`,
      price, indicators: ind, pcr: (typeof feed !== 'undefined' && feed.ready) ? feed.pcr : (snap?.pcr ?? null),
      oiChange, oiSr, maxPain,
      vix: { value: vixVal0, safe: vixVal0 == null || vixVal0 < 20 },
      session, ceQuote, peQuote, livePremiums: {}, history: recHistory,
      adx: adxState, macd: macdResult ? { crossover: macdResult.crossover, histogram: macdResult.histogramDirection } : null,
      supertrend: stResult ? stResult.direction : null
    });
  }

  // ── GATE 3: VIX extreme — pause when fear is very high ───────────────
  const vixVal = vix?.vixValue ?? null;
  const vixOk  = vixVal == null || vixVal < 22;
  if (vixVal != null && vixVal >= 22) {
    return ({
      direction: 'NEUTRAL', confidence: 50, bullPct: 50, bearPct: 50,
      recommendation: null, noTradeReason: `India VIX ${vixVal.toFixed(1)} ≥ 22 — high volatility, option premiums are expensive and direction is unreliable`,
      price, indicators: ind, pcr: (typeof feed !== 'undefined' && feed.ready) ? feed.pcr : (snap?.pcr ?? null),
      oiChange, oiSr, maxPain,
      vix: { value: vixVal, safe: false },
      session, ceQuote, peQuote, livePremiums: {}, history: recHistory,
      adx: adxState, macd: macdResult ? { crossover: macdResult.crossover, histogram: macdResult.histogramDirection } : null,
      supertrend: stResult ? stResult.direction : null
    });
  }

  // ── Synthesise direction (8 factors) ─────────────────────────────────
  // Positive = bullish, Negative = bearish
  const scores = {};

  // 1. OI buildup — 25 pts. With the live feed, use its TYPE-AWARE
  // votes: a put long-buildup is bearish, a put short-buildup bullish.
  // The old summary-count formula was type-blind — it read every
  // long-buildup as bullish, so heavy put buying scored as support.
  if (feed.ready) {
    const total = (feed.bullVotes + feed.bearVotes) || 1;
    scores.oiBuildup = ((feed.bullVotes - feed.bearVotes) / total) * 25;
  } else if (oiChange?.summary) {
    const s = oiChange.summary;
    const bullOI = (s.longBuildup || 0) + (s.shortCovering || 0) * 0.5;
    const bearOI = (s.shortBuildup || 0) + (s.longUnwinding || 0) * 0.5;
    const totalOI = bullOI + bearOI || 1;
    scores.oiBuildup = ((bullOI - bearOI) / totalOI) * 25;
  } else {
    scores.oiBuildup = 0;
  }

  // 2. PCR TREND — 15 pts. Measured on real per-minute OI: the PCR
  // LEVEL called direction at 46% (worse than a coin) and is no longer
  // scored; the 10-minute trend reached ~61% at a 30-minute horizon.
  // Rising PCR = fresh put writing = floor being defended = bullish.
  scores.pcr = 0;
  const pcrTrend10 = feed.ready ? feed.pcr?.trend?.m10 : null;
  if (pcrTrend10 != null) {
    if      (pcrTrend10 >=  0.02) {
      scores.pcr =  15;
    } else if (pcrTrend10 >=  0.01) {
      scores.pcr =   8;
    } else if (pcrTrend10 <= -0.02) {
      scores.pcr = -15;
    } else if (pcrTrend10 <= -0.01) {
      scores.pcr =  -8;
    }
  }

  // 3. EMA trend — 15 pts (was 20; lightened per walk-forward: heavy
  // EMA weight over-traded trends that MACD already scores)
  scores.ema = 0;
  if (ind && price != null) {
    const ema20 = ind.ema20, ema50 = ind.ema50;
    if      (ema20 && ema50 && price > ema20 && ema20 > ema50) {
      scores.ema =  15;
    } else if (ema20 && ema50 && price < ema20 && ema20 < ema50) {
      scores.ema = -15;
    } else if (ema20 && price > ema20)  {
      scores.ema =  7.5;
    } else if (ema20 && price < ema20)  {
      scores.ema = -7.5;
    }
  }

  // 4. OI S/R distance — 10 pts
  scores.oiSr = 0;
  if (oiSr && price != null) {
    const res = oiSr.resistance?.strike;
    const sup = oiSr.support?.strike;
    if (res && sup) {
      const range    = res - sup || 1;
      const position = (price - sup) / range;
      if      (position <= 0.2)  {
        scores.oiSr =  10;
      } else if (position <= 0.35) {
        scores.oiSr =   5;
      } else if (position >= 0.8)  {
        scores.oiSr = -10;
      } else if (position >= 0.65) {
        scores.oiSr =  -5;
      }
    } else if (oiSr.priceRelation === 'near-support')    {
      scores.oiSr =   7;
    } else if   (oiSr.priceRelation === 'near-resistance')  {
      scores.oiSr =  -7;
    }
  }

  // 5. MACD — 10 pts (was 15; lightened per walk-forward). Tiers keep
  // the validated engine's exact 1 : 2/3 : 1/3 shape.
  scores.macd = 0;
  if (macdResult) {
    if      (macdResult.crossover === 'bullish')                                                {
      scores.macd =  10;
    } else if (macdResult.crossover === 'bearish')                                                {
      scores.macd = -10;
    } else if (macdResult.histogramDirection === 'rising'  && macdResult.macd != null && macdResult.macd > 0) {
      scores.macd =  10 * 2 / 3;
    } else if (macdResult.histogramDirection === 'falling' && macdResult.macd != null && macdResult.macd < 0) {
      scores.macd = -10 * 2 / 3;
    } else if (macdResult.histogramDirection === 'rising')   {
      scores.macd =  10 / 3;
    } else if (macdResult.histogramDirection === 'falling')  {
      scores.macd = -10 / 3;
    }
  }

  // 6. RSI alignment — 10 pts (momentum confirmation, NOT contrarian here)
  // RSI > 60 with uptrend = momentum confirms. RSI < 40 with downtrend = confirms.
  // RSI in 40-60 = neutral, no score.
  scores.rsi = 0;
  const rsiVal = ind?.rsi ?? null;
  if (rsiVal != null) {
    if      (rsiVal > 65) {
      scores.rsi =  10;
    } else if (rsiVal > 55) {
      scores.rsi =   5;
    } else if (rsiVal < 35) {
      scores.rsi = -10;
    } else if (rsiVal < 45) {
      scores.rsi =  -5;
    }
    // 45-55 = flat/neutral → 0
  }

  // 7. SuperTrend — 5 pts (directional trend filter)
  scores.supertrend = 0;
  if (stResult?.direction) {
    if      (stResult.direction === 'UP')   {
      scores.supertrend =  5;
    } else if (stResult.direction === 'DOWN')  {
      scores.supertrend = -5;
    }
  }

  // 8. ADX strength bonus — 5 pts to the leading side when trend is strong
  scores.adxBonus = 0;
  if (adxValue != null && adxValue >= 28) {
    // Will apply direction-aware after we know net score
    scores.adxBonus = 5; // placeholder, applied below
  }

  // ── Aggregate ─────────────────────────────────────────────────────────
  const rawNet = scores.oiBuildup + scores.pcr + scores.ema + scores.oiSr +
                       scores.macd + scores.rsi + scores.supertrend;
  // ADX bonus follows the leading side (not directional by itself)
  const netScore = rawNet + (rawNet >= 0 ? scores.adxBonus : -scores.adxBonus);

  // Seasonal back-of-mind tilt (user switch, OFF by default): qualifying
  // months (>=7-of-10-years bar) nudge the score by ±2 points. Not part
  // of MAX_TOTAL — it leans conviction ~1%, it is not a scored factor.
  let seasonal = { enabled: false, nudge: 0 };
  try {
    seasonal = await liveTiltState();
  } catch { /* tilt is optional */ }
  const tiltedScore = netScore + seasonal.nudge;

  // Max possible: chain 50 (OI 25 + PCR 15 + S/R 10) + EMA 15 +
  // MACD 10 + RSI 10 + ST 5 + ADX 5 = 95. Map –95…+95 to 0…100 bull%.
  const MAX_TOTAL = 95;
  const bullPct = Math.round(Math.min(100, Math.max(0, (tiltedScore + MAX_TOTAL) / (2 * MAX_TOTAL) * 100)));
  const bearPct = 100 - bullPct;
  const confidence = Math.max(bullPct, bearPct);

  // ── GATE 4: MACD must not flatly contradict the direction ─────────────
  // If OI/EMA/RSI say BUY but MACD is in hard bearish crossover → skip.
  // This catches "signal at market top/bottom before reversal confirms".
  const provisionalDir = bullPct >= MIN_DIRECTION_PCT ? 'BUY'
    : bearPct >= MIN_DIRECTION_PCT ? 'SELL'
      : 'NEUTRAL';
  let macdContradicts = false;
  if (provisionalDir === 'BUY'  && macdResult?.crossover === 'bearish') {
    macdContradicts = true;
  }
  if (provisionalDir === 'SELL' && macdResult?.crossover === 'bullish') {
    macdContradicts = true;
  }
  if (macdContradicts) {
    return ({
      direction: 'NEUTRAL', confidence, bullPct, bearPct,
      recommendation: null,
      noTradeReason: `MACD ${macdResult.crossover} crossover contradicts ${provisionalDir} signal — waiting for momentum alignment`,
      price, indicators: ind, pcr: (typeof feed !== 'undefined' && feed.ready) ? feed.pcr : (snap?.pcr ?? null),
      oiChange, oiSr, maxPain,
      vix: { value: vixVal, safe: vixOk },
      session, ceQuote, peQuote, livePremiums: {}, history: recHistory,
      scores, adx: adxState,
      macd: { crossover: macdResult.crossover, histogram: macdResult.histogramDirection },
      supertrend: stResult?.direction ?? null
    });
  }

  // Weaker setups still surface on the dashboard (MIN_DIRECTION_PCT is
  // looser than the old 75% bar) but they must clear a real floor first,
  // and the same floor drives provisionalDir above so the MACD screen has
  // already run on everything shown here.
  const direction = bullPct >= MIN_DIRECTION_PCT ? 'BUY'
    : bearPct >= MIN_DIRECTION_PCT ? 'SELL'
      : 'NEUTRAL';

  // ── Option recommendation ─────────────────────────────────────────────
  let recommendation = null;
  const optQ    = direction === 'BUY' ? ceQuote : direction === 'SELL' ? peQuote : null;
  const optType = direction === 'BUY' ? 'CE' : direction === 'SELL' ? 'PE' : null;

  if (optQ && direction !== 'NEUTRAL') {
    const prem     = optQ.premium;
    const isBear   = direction === 'SELL';
    const mp       = maxPain?.maxPainStrike ?? null;
    const res      = oiSr?.resistance?.strike ?? null;
    const sup      = oiSr?.support?.strike   ?? null;
    const sp       = optQ.spotPrice;

    // ── Chain-based exits ─────────────────────────────────────────────
    // SL and targets come from the option chain's own structure — the
    // OI walls and max pain — translated into premium through the
    // option's implied volatility. Nothing is a fixed percentage; the
    // R:R is whatever the chain's geometry actually offers. The old
    // ATR/multiple construction (which made T1 always 1:1) survives
    // only as a labelled fallback when the chain is degenerate.
    const { impliedVol, bsPrice: bsAt, dteYears } = require('../utils/optionMath');
    const K = optQ.strike ?? (sp != null ? Math.round(sp / 50) * 50 : null);
    const nowSec = Math.floor(Date.now() / 1000);
    const Texp = dteYears(nowSec);
    const iv = (sp != null && K != null) ? impliedVol(optType, sp, K, Texp, prem) : null;

    // Candidate underlying levels, ordered in the trade's favour.
    // BUY: SL below at the PE wall; targets above from the CE wall and
    // max pain, extended by the wall-to-wall span for T3. SELL mirrored.
    let ulSl = isBear ? res : sup;

    // Stop the way traders actually mark it: the NEAREST defensive
    // structure — the last ~1 hour's swing low/high — not the far OI
    // wall. The wall keeps its job as the thesis-break exit (the
    // lifecycle's wall-break check is unchanged); the premium stop
    // just moves to the closest level that proves the entry wrong.
    let slBasis = 'wall';
    if (candles.length >= 12 && sp != null) {
      const recent = candles.slice(-12);
      const swing = isBear
        ? Math.max(...recent.map(c => c.high))
        : Math.min(...recent.map(c => c.low));
      const buf = sp * 0.0005;
      const swingLevel = isBear ? swing + buf : swing - buf;
      const swingValid = isBear ? swingLevel > sp : swingLevel < sp;
      if (swingValid && (ulSl == null || (isBear ? swingLevel < ulSl : swingLevel > ulSl))) {
        ulSl = Math.round(swingLevel);
        slBasis = 'swing';
      }
    }
    let ulTargets = [];
    if (sp != null) {
      const buffer = sp * 0.0006;   // ~15 pts: a level must clear spot meaningfully
      // A target must also be REACHABLE today: beyond ~2.5% from spot is
      // not an intraday level, it is a degenerate chain read (a bad S/R
      // row once produced T3 = the whole strike value, ₹22,693 on a ₹51
      // option — ordered, therefore accepted; never again).
      const reach = sp * 0.025;
      const sane = (v) => v != null && Math.abs(v - sp) <= reach;
      const span = Math.min(
        (res != null && sup != null) ? Math.abs(res - sup) : sp * 0.006,
        sp * 0.008
      );
      const cands = isBear
        ? [sup, mp, (sup ?? sp) - span].filter(v => sane(v) && v < sp - buffer)
        : [res, mp, (res ?? sp) + span].filter(v => sane(v) && v > sp + buffer);
      ulTargets = [...new Set(cands.map(v => Math.round(v)))]
        .sort((a, b) => isBear ? b - a : a - b)   // nearest first — coherent T1<T2<T3
        .slice(0, 3);
      while (ulTargets.length < 3 && ulTargets.length > 0) {
        const last = ulTargets[ulTargets.length - 1];
        const next = Math.round(isBear ? last - span : last + span);
        if (!sane(next)) {
          break;
        }                   // stay inside the reachable band
        ulTargets.push(next);
      }
    }
    const slValid = ulSl != null && sp != null && (isBear ? ulSl > sp : ulSl < sp);

    let premiumSL, premiumT1, premiumT2, premiumT3, exitBasis;
    const premAtSpot = (level) => Number(bsAt(optType, level, K, Texp, iv).toFixed(2));
    // IV inversion must be believable — outside 4%–150% the premium/model
    // disagreement is data trouble, and every translated level would lie.
    const ivSane = iv != null && iv >= 0.04 && iv <= 1.5;
    if (ivSane && slValid && ulTargets.length === 3) {
      premiumSL = premAtSpot(ulSl);
      // Hard money cap: never risk more than 30% of the premium, no
      // matter how far the structure sits. Digestible first.
      if (premiumSL < prem * 0.70) {
        premiumSL = Number((prem * 0.70).toFixed(2));
        slBasis = 'cap-30%';
      }
      [premiumT1, premiumT2, premiumT3] = ulTargets.map(premAtSpot);
      // Desk rule: each target step is at most +50% of entry premium
      // (T1 <= 1.5x, T2 <= 2x, T3 <= 2.5x). A chain level may pull a
      // target NEARER, never further — a +300% first target once let a
      // +166% winner round-trip to a loss because nothing ever ratcheted.
      premiumT1 = Number(Math.min(premiumT1, prem * 1.5).toFixed(2));
      premiumT2 = Number(Math.min(premiumT2, prem * 2.0).toFixed(2));
      premiumT3 = Number(Math.min(premiumT3, prem * 2.5).toFixed(2));
      exitBasis = 'option-chain';
    }
    // Sanity: SL must be below entry, targets above and increasing —
    // otherwise the chain read is degenerate and we fall back honestly.
    if (exitBasis !== 'option-chain'
              || !(premiumSL < prem) || !(premiumT1 > prem)
              || !(premiumT2 > premiumT1) || !(premiumT3 > premiumT2)
              // magnitude guard: no intraday target exceeds a full 3%-of-spot
              // premium gain — beyond that the translation is lying
              || !(premiumT3 <= prem + sp * 0.03)) {
      if (atr != null && sp != null && sp > 0) {
        const slDrop = atr * 0.5 * 1.5;
        premiumSL = Number(Math.max(prem * 0.50, Math.min(prem * 0.70, prem - slDrop)).toFixed(2));
      } else {
        premiumSL = Number((prem * 0.65).toFixed(2));
      }
      const risk = prem - premiumSL;
      premiumT1 = Number((prem + risk * 1.0).toFixed(2));
      premiumT2 = Number((prem + risk * 1.8).toFixed(2));
      premiumT3 = Number((prem + risk * 2.5).toFixed(2));
      exitBasis = 'fallback-atr';
    }
    const ulT1 = ulTargets[0] ?? null, ulT2 = ulTargets[1] ?? null, ulT3 = ulTargets[2] ?? null;

    // ── Reasoning ─────────────────────────────────────────────────────
    const reasons = [];

    // OI buildup
    if (oiChange?.summary) {
      const s = oiChange.summary;
      if (isBear && (s.shortBuildup || 0) > 0) {
        reasons.push(`Short buildup on ${s.shortBuildup} strikes — fresh positions as price falls, confirms bearish intent.`);
      }
      if (isBear && (s.longUnwinding || 0) > 0) {
        reasons.push(`Long unwinding on ${s.longUnwinding} strikes — longs exiting, no buyers defending.`);
      }
      if (!isBear && (s.longBuildup || 0) > 0) {
        reasons.push(`Long buildup on ${s.longBuildup} strikes — fresh longs added as price rises, confirms bullish intent.`);
      }
      if (!isBear && (s.shortCovering || 0) > 0) {
        reasons.push(`Short covering on ${s.shortCovering} strikes — bears exiting, upside momentum building.`);
      }
    }

    // PCR — the TREND is what's scored (level tested worse than a coin)
    if (pcrTrend10 != null) {
      if (pcrTrend10 >= 0.01) {
        reasons.push(`PCR rising (+${pcrTrend10.toFixed(3)} in 10 min) — fresh put writing, writers defending the downside.`);
      } else if (pcrTrend10 <= -0.01) {
        reasons.push(`PCR falling (${pcrTrend10.toFixed(3)} in 10 min) — put writers pulling back, floor weakening.`);
      } else {
        reasons.push('PCR flat over 10 min — writers not committing either way.');
      }
    } else if (feed.ready && feed.pcr?.pcr != null) {
      reasons.push(`PCR ${feed.pcr.pcr.toFixed(2)} (level shown for context; not scored — trend still warming up).`);
    }

    // EMA
    if (ind?.ema20 && ind?.ema50 && sp != null) {
      if (isBear && sp < ind.ema20 && ind.ema20 < ind.ema50) {
        reasons.push(`Price (${Math.round(sp)}) < EMA20 (${Math.round(ind.ema20)}) < EMA50 (${Math.round(ind.ema50)}) — confirmed 5-min downtrend.`);
      } else if (!isBear && sp > ind.ema20 && ind.ema20 > ind.ema50) {
        reasons.push(`Price (${Math.round(sp)}) > EMA20 (${Math.round(ind.ema20)}) > EMA50 (${Math.round(ind.ema50)}) — confirmed 5-min uptrend.`);
      } else if (isBear)  {
        reasons.push(`Price below EMA20 — short-term momentum bearish.`);
      } else               {
        reasons.push(`Price above EMA20 — short-term momentum bullish.`);
      }
    }

    // MACD
    if (macdResult) {
      if (macdResult.crossover !== 'none') {
        reasons.push(`MACD ${macdResult.crossover} crossover — momentum shift confirmed.`);
      } else if (macdResult.histogramDirection !== 'flat') {
        reasons.push(`MACD histogram ${macdResult.histogramDirection} — momentum ${macdResult.histogramDirection === 'rising' ? 'building' : 'fading'}.`);
      }
    }

    // RSI
    if (rsiVal != null) {
      if (!isBear && rsiVal > 55) {
        reasons.push(`RSI ${rsiVal.toFixed(1)} > 55 — bullish momentum active.`);
      }
      if (isBear && rsiVal < 45)  {
        reasons.push(`RSI ${rsiVal.toFixed(1)} < 45 — bearish momentum active.`);
      }
    }

    // ADX
    if (adxValue != null) {
      reasons.push(`ADX ${adxValue.toFixed(1)} — ${adxValue >= 28 ? 'strong trend, high conviction' : 'trend present but moderate'}.`);
    }

    // SuperTrend
    if (stResult?.direction) {
      reasons.push(`SuperTrend: ${stResult.direction} — ${stResult.direction === (isBear ? 'DOWN' : 'UP') ? 'aligned with signal' : 'mixed'}.`);
    }

    // OI S/R
    if (res && isBear)  {
      reasons.push(`OI resistance at ${res} — CE wall, institutional sellers defending.`);
    }
    if (sup && !isBear) {
      reasons.push(`OI support at ${sup} — PE wall, put writers protecting floor.`);
    }

    // Max pain
    if (mp && sp != null) {
      const dist = mp - sp;
      if (isBear && dist < 0) {
        reasons.push(`Max pain at ${mp} below spot — expiry gravity favors puts.`);
      } else if (!isBear && dist > 0) {
        reasons.push(`Max pain at ${mp} above spot — expiry gravity favors calls.`);
      }
    }

    // SL basis
    const riskPerUnit = prem - premiumSL;
    if (exitBasis === 'option-chain') {
      const slText = slBasis === 'swing'
        ? `SL ₹${premiumSL} = premium if NIFTY breaks the last hour's ${isBear ? 'swing high' : 'swing low'} at ${ulSl} — the nearest structure, the way traders mark it`
        : slBasis === 'cap-30%'
          ? `SL ₹${premiumSL} = hard 30% premium cap (structure sits farther; risk stays digestible)`
          : `SL ₹${premiumSL} = premium if NIFTY breaks the ${isBear ? 'CE wall at' : 'PE wall at'} ${ulSl}`;
      reasons.push(`${slText} — risking ₹${riskPerUnit.toFixed(0)} per unit. If NIFTY closes through this level the trade also exits on structure, premium aside.`);
      reasons.push(`Targets are the chain's own levels — ${ulT1}, ${ulT2}, ${ulT3} (OI walls / max pain / wall-span extension) converted to premium. R:R is whatever that geometry gives, not a fixed multiple.`);
      reasons.push('Premium conversions assume the move happens today; theta makes far targets slightly optimistic.');
    } else {
      reasons.push(`SL ₹${premiumSL} set at ${atr ? `1.5×ATR (ATR=${atr.toFixed(1)})` : '35% of entry'} — risking ₹${riskPerUnit.toFixed(0)} per unit (chain levels degenerate — fallback exits).`);
    }
    reasons.push(`ATM ${optType} strike ${optQ.strike} — best delta for directional move.`);

    recommendation = {
      action:        optQ.trade,
      optionType:    optType,
      strike:        optQ.strike,
      tradingsymbol: optQ.tradingsymbol,
      expiry:        optQ.selectedExpiry,
      spotPrice:     sp,
      premiumEntry:  prem,
      premiumT1,
      premiumT2,
      premiumT3,
      premiumSL,
      ulSl,
      ulT1,
      ulT2,
      ulT3,
      exitBasis,
      slBasis,
      iv: iv != null ? Number((iv * 100).toFixed(1)) : null,
      maxPainLevel:  mp,
      reasons
    };
  }

  // ── Trade lifecycle: one active trade, resolved by ITS levels ────────
  // Evaluate first (a stop/target/EOD frees the slot), then open on a
  // fresh gated signal. The card leads with the active trade; the live
  // analysis keeps flickering underneath as information, not as calls.
  let activeTrade = await m2trade.evaluateActive({
    spot: price,
    oppositeConviction: null   // set below once we know the active side
  });
  if (activeTrade && activeTrade.status === 'active') {
    const opp = activeTrade.direction === 'BUY' ? bearPct : bullPct;
    activeTrade = await m2trade.evaluateActive({ spot: price, oppositeConviction: opp,
      premium: Number(activeTrade.last_premium) || undefined });
  }
  // Automatic catch-up: a ledger trade whose entry never reached the
  // account gets entered for real when its side clears the gate NOW
  // and the premium is inside the chase cap (guards + throttle inside).
  if (activeTrade && activeTrade.status === 'active') {
    const sidePct = activeTrade.direction === 'BUY' ? bullPct : bearPct;
    execution.maybeCatchUpEntry(activeTrade, sidePct).catch(() => {});
    // and never hold a real position without a stop resting on the exchange
    execution.ensureStopResting(activeTrade).catch(() => {});
  }
  let openedThisPoll = null;
  if ((!activeTrade || activeTrade.status !== 'active')
            && direction !== 'NEUTRAL' && recommendation) {
    openedThisPoll = await m2trade.openTrade(recommendation, direction, confidence, recommendation.reasons);
    if (openedThisPoll) {
      activeTrade = openedThisPoll;
    }
  }

  // ── One call at a time, like the backtest ─────────────────────────
  // While a trade is active the system makes NO new calls: the fresh
  // recommendation is suppressed (the analysis percentages stay visible
  // as context) and nothing is logged. A follower of this screen takes
  // exactly the trades the ledger takes — 3 calls means 3 brokerages,
  // not 26 re-prints of the same mood.
  const tradeIsActive = activeTrade && activeTrade.status === 'active';
  let holdNote = null;
  if (tradeIsActive && !openedThisPoll) {
    holdNote = `Holding ${activeTrade.tradingsymbol} — one trade at a time. ` +
            `Next call comes after this trade resolves on its levels.`;
    recommendation = null;
  }
  const tradeView = activeTrade ? {
    id: activeTrade.id,
    status: activeTrade.status,
    direction: activeTrade.direction,
    tradingsymbol: activeTrade.tradingsymbol,
    strike: activeTrade.strike,
    expiry: activeTrade.expiry,
    entryTime: activeTrade.entry_time,
    entryPremium: Number(activeTrade.entry_premium),
    slPremium: Number(activeTrade.sl_premium),
    trailSl: Number(activeTrade.trail_sl),
    t1: Number(activeTrade.t1_premium), t2: Number(activeTrade.t2_premium), t3: Number(activeTrade.t3_premium),
    ulLevels: activeTrade.ul_levels,
    targetsHit: activeTrade.targets_hit,
    lastPremium: activeTrade.last_premium != null ? Number(activeTrade.last_premium) : null,
    confidenceAtEntry: activeTrade.confidence,
    // "If I wanted to enter this trade NOW": the current conviction on
    // the trade's own side, and whether it would still clear the gate.
    enterNowPct: activeTrade.direction === 'BUY' ? bullPct : bearPct,
    enterNowOk: (activeTrade.direction === 'BUY' ? bullPct : bearPct) >= MIN_DIRECTION_PCT,
    statusInfo: m2trade.describe(activeTrade, direction)
  } : null;

  // The signal log is a ledger of CALLS, not moods: write only when a
  // trade was actually opened this poll (this also scopes email alerts
  // to real calls).
  if (openedThisPoll && recommendation) {
    logRec(recommendation, direction, confidence, ind, feed.ready ? feed.pcr : snap?.pcr);
  }

  const livePremiums = {};
  if (ceQuote?.tradingsymbol) {
    livePremiums[ceQuote.tradingsymbol] = ceQuote.premium;
  }
  if (peQuote?.tradingsymbol) {
    livePremiums[peQuote.tradingsymbol] = peQuote.premium;
  }

  return ({
    direction, confidence, bullPct, bearPct,
    recommendation,
    activeTrade: tradeView,
    recentTrades: (await m2trade.recentTrades(6)).map(t => ({
      status: t.status, direction: t.direction, tradingsymbol: t.tradingsymbol,
      entryPremium: Number(t.entry_premium), exitPremium: t.exit_premium != null ? Number(t.exit_premium) : null,
      reason: t.resolve_reason, exitTime: t.exit_time
    })),
    noTradeReason: holdNote ? holdNote
      : direction !== 'NEUTRAL' ? null
      // All-zero factors is starvation, not balance — say so honestly
      // instead of pretending a 50/50 split was computed.
        : Object.values(scores).every(v => v === 0)
          ? 'No market data — every factor scored 0 (Zerodha login likely expired; log in at /auth/zerodha/login)'
          : `Conviction ${confidence}% < ${MIN_DIRECTION_PCT}% — factors are split, no side has a clear edge`,
    price,
    indicators: ind,
    pcr: (typeof feed !== 'undefined' && feed.ready) ? feed.pcr : (snap?.pcr ?? null),
    oiChange, oiSr, maxPain,
    vix: { value: vixVal, safe: vixOk },
    session,
    ceQuote, peQuote,
    livePremiums,
    history: recHistory,
    scores,
    seasonal: { enabled: seasonal.enabled, month: seasonal.currentMonth, tilt: seasonal.currentTilt, nudge: seasonal.nudge },
    // live Method-1 breakout read + the "prime" verdict: a Method-2 call
    // WITH an aligned breakout is the PF-1.40 / 50.9%-win signal class
    breakout,
    // pro context for the desk: ATM implied vols (and the PE−CE skew,
    // the market's fear gauge) and the day's OHLC off the websocket
    atmIv: (() => {
      try {
        const { impliedVol: ivFn, dteYears: dteFn } = require('../utils/optionMath');
        const T = dteFn(Math.floor(Date.now() / 1000));
        const ce = (ceQuote?.premium && ceQuote?.strike && ceQuote?.spotPrice)
          ? ivFn('CE', ceQuote.spotPrice, ceQuote.strike, T, ceQuote.premium) : null;
        const pe = (peQuote?.premium && peQuote?.strike && peQuote?.spotPrice)
          ? ivFn('PE', peQuote.spotPrice, peQuote.strike, T, peQuote.premium) : null;
        if (ce == null && pe == null) {
          return null;
        }
        return {
          ce: ce != null ? +(ce * 100).toFixed(1) : null,
          pe: pe != null ? +(pe * 100).toFixed(1) : null,
          skew: ce != null && pe != null ? +((pe - ce) * 100).toFixed(1) : null
        };
      } catch {
        return null;
      }
    })(),
    day: (() => {
      try {
        const c = tickerService.getChain('NIFTY'); return { spot: c.spot, spotAgeMs: c.spotAgeMs, ohlc: c.dayOhlc };
      } catch {
        return null;
      }
    })(),
    prime: direction !== 'NEUTRAL'
            && ((direction === 'BUY' && breakout?.sig === 1) || (direction === 'SELL' && breakout?.sig === -1)),
    adx: adxState,
    macd: macdResult ? { crossover: macdResult.crossover, histogram: macdResult.histogramDirection, macd: macdResult.macd } : null,
    supertrend: stResult?.direction ?? null
  });
}

async function getMethod2() {
  if (m2Cache.body && Date.now() - m2Cache.at < 2000) {
    return m2Cache.body;
  }
  const body = await computeMethod2();
  m2Cache = { body, at: Date.now() };
  return body;
}

// The pulse endpoint overlays the last computed conviction when it is recent.
function getM2CacheBody(maxAgeMs) {
  if (m2Cache.body && Date.now() - m2Cache.at < maxAgeMs) {
    return m2Cache.body;
  }
  return null;
}

function getRecHistory() {
  return recHistory;
}

module.exports = {
  getMethod2,
  computeMethod2,
  getM2CacheBody,
  loadSignalHistory,
  getRecHistory,
  MIN_DIRECTION_PCT
};
