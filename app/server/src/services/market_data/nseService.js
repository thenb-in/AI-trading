'use strict';
const axios = require('axios');
const { TradingViewAPI } = require('tradingview-scraper');
const { ema, rsi, MACD, ADX } = require('technicalindicators');
const logger = require('@startup/logger');
const { evaluateRsiDeadZone, evaluateVwapDeadZone, evaluateMarketSession } = require('./marketHelpers');
const { getTunables } = require('@appServer/src/config/tradingConfig');
const { getNiftyAtmOptionQuote, getNiftyAtmPcr, getNiftyPcrFromZerodha, calculateMaxPain, getOiBasedSupportResistance, getNiftySpotFromZerodha, getIndiaVixFromZerodha, fetchHistoricalCandles } = require('@appServer/interfaces/broker');
const { getOiChangeAnalysis } = require('../optionSnapshotService');

const NSE_QUOTE_URL = 'https://www.nseindia.com/api/quote-equity?symbol=NIFTY%2050';
const NSE_INDICES_URL = 'https://www.nseindia.com/api/equity-stockIndices';
const NSE_INDICES_NIFTY_URL = 'https://www.nseindia.com/api/equity-stockIndices?index=NIFTY%2050';
const NSE_INDICES_BANKNIFTY_URL = 'https://www.nseindia.com/api/equity-stockIndices?index=NIFTY%20BANK';
const NSE_OPTION_CHAIN_NIFTY_URL = 'https://www.nseindia.com/api/option-chain-indices?symbol=NIFTY';
const NSE_OPTION_CHAIN_PAGE_URL = 'https://www.nseindia.com/option-chain';
const NSE_ORIGIN = 'https://www.nseindia.com';

const defaultHeaders = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
  Referer: 'https://www.nseindia.com/',
  Accept: 'application/json',
};

/** Full browser-like headers for NSE option-chain API (improves compatibility). */
const optionChainBrowserHeaders = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Accept: 'application/json,text/plain,*/*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  Connection: 'keep-alive',
  Referer: 'https://www.nseindia.com/option-chain',
};

/** TradingView symbol for NIFTY 50 on NSE. */
const TV_NIFTY_SYMBOL = 'NSE:NIFTY';
/** TradingView symbol for Bank Nifty on NSE. */
const TV_BANKNIFTY_SYMBOL = 'NSE:BANKNIFTY';

/** Yahoo Finance NIFTY 50 index symbol. */
const YAHOO_NIFTY_SYMBOL = '^NSEI';
/** Yahoo Finance Bank Nifty index symbol. */
const YAHOO_BANKNIFTY_SYMBOL = '^NSEBANK';
const YAHOO_OPTIONS_BASE = 'https://query1.finance.yahoo.com/v7/finance/options';
const YAHOO_OPTIONS_URL = `${YAHOO_OPTIONS_BASE}/${encodeURIComponent(YAHOO_NIFTY_SYMBOL)}`;

const DEFAULT_INDICATOR_WINDOW_SIZE = 5;

function getEffectiveWindowSize(windowSize) {
  if (typeof windowSize !== 'number' || !Number.isFinite(windowSize)) {
    return DEFAULT_INDICATOR_WINDOW_SIZE;
  }

  return Math.max(1, Math.floor(windowSize));
}

function averageRecentValues(values, windowSize) {
  const validValues = values.filter((value) => Number.isFinite(value));
  if (validValues.length === 0) {
    return null;
  }

  const recentValues = validValues.slice(-windowSize);
  const total = recentValues.reduce((sum, value) => sum + value, 0);
  return total / recentValues.length;
}

/**
 * Computes NIFTY market bias from latestClosePrice, ema20, ema50.
 */
async function getNiftyMarketBias(windowSize = DEFAULT_INDICATOR_WINDOW_SIZE) {
  const data = await getNiftyCandles(windowSize);
  const price = data.latestClosePrice;
  const ema20Val = data.ema20;
  const ema50Val = data.ema50;

  if (price == null || ema20Val == null) {
    return {
      bias: 'Flat',
      latestClosePrice: price,
      ema20: ema20Val,
      ema50: ema50Val,
    };
  }

  let bias = 'Flat';
  if (price > ema20Val && ema50Val != null && ema20Val > ema50Val) {
    bias = 'Strong Bullish';
  } else if (price > ema20Val) {
    bias = 'Bullish';
  } else if (price < ema20Val && ema50Val != null && ema20Val < ema50Val) {
    bias = 'Strong Bearish';
  } else if (price < ema20Val) {
    bias = 'Bearish';
  }

  return {
    bias,
    latestClosePrice: price,
    ema20: ema20Val,
    ema50: ema50Val,
  };
}

/**
 * Shared: fetches 5m candles from Zerodha historical API and computes EMA20, EMA50, VWAP, RSI(14).
 */
async function getCandlesAndIndicators(zerodhaSymbol, _unused, logLabel, windowSize = DEFAULT_INDICATOR_WINDOW_SIZE) {
  const effectiveWindowSize = getEffectiveWindowSize(windowSize);
  try {
    logger.info(`Fetching ${logLabel} candle data from Zerodha windowSize=${effectiveWindowSize}`);

    const toUnix = Math.floor(Date.now() / 1000);
    const fromUnix = toUnix - 5 * 24 * 60 * 60; // last 5 days of 5m candles
    const allCandles = await fetchHistoricalCandles(zerodhaSymbol, fromUnix, toUnix);
    const candles = allCandles.slice(-100); // most recent 100 candles for indicators
    const latestClosePrice = candles.length > 0 ? candles[candles.length - 1].close : null;

    logger.info(`[nseService] ${logLabel} Zerodha candles fetched total=${allCandles.length} used=${candles.length}`);

    let ema20 = null;
    let ema50 = null;
    if (candles.length >= 20) {
      const closePrices = candles.map((c) => c.close);
      try {
        const ema20Arr = ema({ period: 20, values: closePrices });
        const ema20Values = ema20Arr.filter((v) => typeof v === 'number' && !Number.isNaN(v));
        ema20 = averageRecentValues(ema20Values, effectiveWindowSize);
        if (candles.length >= 50) {
          const ema50Arr = ema({ period: 50, values: closePrices });
          const ema50Values = ema50Arr.filter((v) => typeof v === 'number' && !Number.isNaN(v));
          ema50 = averageRecentValues(ema50Values, effectiveWindowSize);
        }
        logger.info(`EMA20 rolling average windowSize=${effectiveWindowSize} value=${ema20}`);
        logger.info(`EMA50 rolling average windowSize=${effectiveWindowSize} value=${ema50}`);
      } catch (emaErr) {
        logger.error(`[nseService] EMA calculation failed err=${emaErr instanceof Error ? emaErr.message : emaErr}`, emaErr);
      }
    }

    let vwap = null;
    if (candles.length > 0) {
      const recentCandles = candles.slice(-Math.min(candles.length, effectiveWindowSize));
      let cumTpV = 0;
      let cumV = 0;
      for (const c of recentCandles) {
        const typicalPrice = (c.high + c.low + c.close) / 3;
        const vol = c.volume ?? 0;
        cumTpV += typicalPrice * vol;
        cumV += vol;
      }
      if (cumV > 0) {
        vwap = cumTpV / cumV;
      } else {
        const sumTp = recentCandles.reduce((s, c) => s + (c.high + c.low + c.close) / 3, 0);
        vwap = sumTp / recentCandles.length;
      }
      if (vwap != null) {
        logger.info(`VWAP rolling value windowSize=${effectiveWindowSize} value=${vwap}`);
      }
    }

    let rsiVal = null;
    let rsiInterpretation = 'neutral';
    if (candles.length >= 15) {
      const closePrices = candles.map((c) => c.close);
      try {
        const rsiArr = rsi({ period: 14, values: closePrices });
        const rsiValues = rsiArr.filter((v) => typeof v === 'number' && !Number.isNaN(v));
        rsiVal = averageRecentValues(rsiValues, effectiveWindowSize);
        if (rsiVal != null) {
          logger.info(`RSI rolling average windowSize=${effectiveWindowSize} value=${rsiVal}`);
          if (rsiVal > 60) rsiInterpretation = 'bullish momentum';
          else if (rsiVal < 40) rsiInterpretation = 'bearish momentum';
        }
      } catch (rsiErr) {
        logger.error(`[nseService] RSI calculation failed err=${rsiErr instanceof Error ? rsiErr.message : rsiErr}`, rsiErr);
      }
    }

    return {
      candles,
      latestClosePrice,
      ema20,
      ema50,
      vwap,
      rsi: rsiVal,
      rsiInterpretation,
      symbol: zerodhaSymbol,
      resolution: '5m',
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`[nseService] getCandlesAndIndicators (${logLabel}) failed message=${message}`, err);
    return {
      candles: [],
      latestClosePrice: null,
      ema20: null,
      ema50: null,
      vwap: null,
      rsi: null,
      rsiInterpretation: 'neutral',
      symbol: zerodhaSymbol,
      resolution: '5m',
      error: message,
    };
  }
}

/** Fetches NIFTY 5m candles and indicators (EMA20, EMA50, VWAP, RSI) from Zerodha. */
async function getNiftyCandles(windowSize = DEFAULT_INDICATOR_WINDOW_SIZE) {
  return getCandlesAndIndicators('NIFTY', null, 'NIFTY', windowSize);
}

/** Fetches BANKNIFTY 5m candles and indicators (EMA20, EMA50, VWAP, RSI) from Zerodha. */
async function getBankNiftyCandles(windowSize = DEFAULT_INDICATOR_WINDOW_SIZE) {
  return getCandlesAndIndicators('BANKNIFTY', null, 'BANKNIFTY', windowSize);
}

function isPcrWeightingEnabled() {
  return getTunables().signalUsePcrWeighting;
}

function getPcrConfidenceWeight(pcr) {
  const normalizedPcr = Math.max(0, Math.min(1, pcr));
  const crowdingScore = Math.min(1, Math.abs(normalizedPcr - 0.5) * 2);
  const minWeight = 0.35;
  return Number((minWeight + (1 - minWeight) * Math.pow(1 - crowdingScore, 2)).toFixed(3));
}

function calculateAtr(candles, period = 14) {
  if (candles.length < 2) {
    return null;
  }

  const trueRanges = [];
  for (let i = 1; i < candles.length; i++) {
    const current = candles[i];
    const previous = candles[i - 1];
    const trueRange = Math.max(
      current.high - current.low,
      Math.abs(current.high - previous.close),
      Math.abs(current.low - previous.close)
    );
    if (Number.isFinite(trueRange)) {
      trueRanges.push(trueRange);
    }
  }

  if (trueRanges.length === 0) {
    return null;
  }

  const effectivePeriod = Math.min(period, trueRanges.length);
  const recentTrueRanges = trueRanges.slice(-effectivePeriod);
  const total = recentTrueRanges.reduce((sum, value) => sum + value, 0);
  return total / recentTrueRanges.length;
}

function getVolatilityTargetMultipliers(candles, price) {
  const atr = calculateAtr(candles);
  if (atr == null || price == null || !Number.isFinite(price) || price <= 0) {
    return {
      atr,
      atrRatio: null,
      target1Multiplier: 1.5,
      target2Multiplier: 2,
    };
  }

  const atrRatio = atr / price;
  const normalizedVolatility = Math.max(0, Math.min(1, atrRatio * 500));
  return {
    atr,
    atrRatio,
    target1Multiplier: Number((1.2 + normalizedVolatility * 0.6).toFixed(2)),
    target2Multiplier: Number((1.8 + normalizedVolatility).toFixed(2)),
  };
}

// ---------------------------------------------------------------------------
// India VIX
// ---------------------------------------------------------------------------

let cachedVix = null;
const VIX_CACHE_TTL_MS = 60_000;

function getVixThresholds() {
  const { vixHigh, vixLow, vixWeight } = getTunables();
  return { high: vixHigh, low: vixLow, weight: vixWeight };
}

async function getIndiaVix() {
  if (cachedVix && Date.now() - cachedVix.timestamp < VIX_CACHE_TTL_MS) {
    return cachedVix.value;
  }
  try {
    // India VIX now comes from Zerodha (NSE:INDIA VIX index quote) instead of
    // scraping nseindia.com, which blocks server requests. Same downstream
    // zone/confidence logic — only the raw value source changed.
    const vixValue = Number(await getIndiaVixFromZerodha());
    if (!Number.isFinite(vixValue) || vixValue <= 0) {
      throw new Error('India VIX value invalid from Zerodha');
    }
    const { high, low, weight } = getVixThresholds();

    let vixZone = 'normal';
    let tradingAllowed = true;
    if (vixValue > high) { vixZone = 'too-volatile'; tradingAllowed = false; }
    else if (vixValue < low) { vixZone = 'too-flat'; tradingAllowed = false; }

    const slAdjustmentFactor = Math.max(0.85, Math.min(1.5, 1.0 + (vixValue - 14) * 0.03));

    let confidenceContribution = 0;
    if (tradingAllowed) {
      const idealCenter = 14.5;
      const idealRange = 1.5;
      const distFromIdeal = Math.abs(vixValue - idealCenter);
      confidenceContribution = Math.round(weight * Math.max(0, 1 - distFromIdeal / (high - idealCenter)));
    }

    const result = { vixValue, tradingAllowed, vixZone, slAdjustmentFactor, confidenceContribution };
    cachedVix = { value: result, timestamp: Date.now() };
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`[nseService] getIndiaVix failed message=${message}`, err);
    return { vixValue: null, tradingAllowed: true, vixZone: 'normal', slAdjustmentFactor: 1, confidenceContribution: 0, error: message };
  }
}

// ---------------------------------------------------------------------------
// Previous Day High/Low/Close (PDH/PDL/PDC)
// ---------------------------------------------------------------------------

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function getIstDateString(unixSeconds) {
  const istDate = new Date(unixSeconds * 1000 + IST_OFFSET_MS);
  return istDate.toISOString().slice(0, 10);
}

function extractPreviousDayLevels(candles) {
  if (candles.length < 2) return { pdh: null, pdl: null, pdc: null };

  const byDate = new Map();
  for (const c of candles) {
    const dateStr = getIstDateString(c.time);
    const arr = byDate.get(dateStr) ?? [];
    arr.push(c);
    byDate.set(dateStr, arr);
  }

  const sortedDates = [...byDate.keys()].sort();
  if (sortedDates.length < 2) return { pdh: null, pdl: null, pdc: null };

  const prevDate = sortedDates[sortedDates.length - 2];
  const prevCandles = byDate.get(prevDate);

  let pdh = -Infinity;
  let pdl = Infinity;
  for (const c of prevCandles) {
    if (c.high > pdh) pdh = c.high;
    if (c.low < pdl) pdl = c.low;
  }
  const pdc = prevCandles[prevCandles.length - 1].close;

  return { pdh: Number.isFinite(pdh) ? pdh : null, pdl: Number.isFinite(pdl) ? pdl : null, pdc };
}

function evaluatePdhPdl(price, levels, signalDir) {
  if (price == null || levels.pdh == null || levels.pdl == null || levels.pdc == null) return null;
  const weight = getTunables().pdhPdlWeight;
  let breakout = 'within-range';
  let contribution = 0;

  if (price > levels.pdh) {
    breakout = 'above-pdh';
    contribution = signalDir === 'BUY' ? weight : 0;
  } else if (price < levels.pdl) {
    breakout = 'below-pdl';
    contribution = signalDir === 'SELL' ? weight : 0;
  } else {
    contribution = Math.round(weight * 0.3);
  }

  return { pdh: levels.pdh, pdl: levels.pdl, pdc: levels.pdc, breakout, confidenceContribution: contribution };
}

// ---------------------------------------------------------------------------
// CPR (Central Pivot Range)
// ---------------------------------------------------------------------------

function calculateCpr(pdh, pdl, pdc, currentPrice, signalDir) {
  const pivot = (pdh + pdl + pdc) / 3;
  const bc = (pdh + pdl) / 2;
  const tc = 2 * pivot - bc;

  const topCpr = Math.max(tc, bc);
  const bottomCpr = Math.min(tc, bc);
  const cprWidth = topCpr - bottomCpr;
  const cprWidthPct = pivot > 0 ? cprWidth / pivot : 0;

  const { cprNarrowThresholdPct: narrowThreshold, cprWeight: weight } = getTunables();
  const dayType = cprWidthPct < narrowThreshold ? 'trending' : 'ranging';

  let priceRelation = 'within-cpr';
  if (currentPrice > topCpr) priceRelation = 'above-tc';
  else if (currentPrice < bottomCpr) priceRelation = 'below-bc';

  let contribution = 0;
  if (dayType === 'trending') {
    if ((priceRelation === 'above-tc' && signalDir === 'BUY') || (priceRelation === 'below-bc' && signalDir === 'SELL')) {
      contribution = weight;
    } else {
      contribution = Math.round(weight * 0.5);
    }
  } else {
    contribution = Math.round(weight * 0.3);
  }

  return { pivot, bc, tc, cprWidth, cprWidthPct, dayType, priceRelation, confidenceContribution: contribution };
}

// ---------------------------------------------------------------------------
// SuperTrend Indicator
// ---------------------------------------------------------------------------

function calculateSuperTrend(candles, signalDir) {
  const { supertrendAtrPeriod: atrPeriod, supertrendMultiplier: multiplier, supertrendWeight: weight } = getTunables();

  if (candles.length < atrPeriod + 1) {
    return { superTrend: null, direction: null, confidenceContribution: 0 };
  }

  // Calculate ATR values for each candle
  const trueRanges = [0];
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const p = candles[i - 1];
    trueRanges.push(Math.max(c.high - c.low, Math.abs(c.high - p.close), Math.abs(c.low - p.close)));
  }

  // Simple moving average ATR
  const atrValues = new Array(candles.length).fill(0);
  for (let i = atrPeriod; i < candles.length; i++) {
    let sum = 0;
    for (let j = i - atrPeriod + 1; j <= i; j++) sum += trueRanges[j];
    atrValues[i] = sum / atrPeriod;
  }

  // Compute SuperTrend
  let prevFinalUpper = Infinity;
  let prevFinalLower = -Infinity;
  let prevDirection = 'UP';
  let superTrendValue = 0;
  let direction = 'UP';

  for (let i = atrPeriod; i < candles.length; i++) {
    const c = candles[i];
    const atr = atrValues[i];
    const hl2 = (c.high + c.low) / 2;
    const basicUpper = hl2 + multiplier * atr;
    const basicLower = hl2 - multiplier * atr;

    const finalUpper = (basicUpper < prevFinalUpper || candles[i - 1].close > prevFinalUpper) ? basicUpper : prevFinalUpper;
    const finalLower = (basicLower > prevFinalLower || candles[i - 1].close < prevFinalLower) ? basicLower : prevFinalLower;

    if (prevDirection === 'UP') {
      direction = c.close < finalLower ? 'DOWN' : 'UP';
    } else {
      direction = c.close > finalUpper ? 'UP' : 'DOWN';
    }

    superTrendValue = direction === 'UP' ? finalLower : finalUpper;
    prevFinalUpper = finalUpper;
    prevFinalLower = finalLower;
    prevDirection = direction;
  }

  let contribution = 0;
  if (signalDir) {
    if ((direction === 'UP' && signalDir === 'BUY') || (direction === 'DOWN' && signalDir === 'SELL')) {
      contribution = weight;
    }
  }

  return { superTrend: superTrendValue, direction, confidenceContribution: contribution };
}

// ---------------------------------------------------------------------------
// MACD
// ---------------------------------------------------------------------------

function calculateMacd(candles, signalDir) {
  const { macdWeight: weight, macdFast: fastPeriod, macdSlow: slowPeriod, macdSignal: signalPeriod } = getTunables();

  if (candles.length < slowPeriod + signalPeriod) {
    return { macd: null, signal: null, histogram: null, crossover: 'none', histogramDirection: 'flat', confidenceContribution: 0 };
  }

  const closePrices = candles.map((c) => c.close);
  try {
    const macdResults = MACD.calculate({
      values: closePrices,
      fastPeriod,
      slowPeriod,
      signalPeriod,
      SimpleMAOscillator: false,
      SimpleMASignal: false,
    });

    if (macdResults.length < 2) {
      return { macd: null, signal: null, histogram: null, crossover: 'none', histogramDirection: 'flat', confidenceContribution: 0 };
    }

    const latest = macdResults[macdResults.length - 1];
    const prev = macdResults[macdResults.length - 2];

    const macdVal = latest.MACD ?? null;
    const signalVal = latest.signal ?? null;
    const histVal = latest.histogram ?? null;
    const prevHistVal = prev.histogram ?? null;

    let crossover = 'none';
    if (latest.MACD != null && latest.signal != null && prev.MACD != null && prev.signal != null) {
      if (prev.MACD < prev.signal && latest.MACD > latest.signal) crossover = 'bullish';
      else if (prev.MACD > prev.signal && latest.MACD < latest.signal) crossover = 'bearish';
    }

    let histogramDirection = 'flat';
    if (histVal != null && prevHistVal != null) {
      if (histVal > prevHistVal) histogramDirection = 'rising';
      else if (histVal < prevHistVal) histogramDirection = 'falling';
    }

    let contribution = 0;
    if (signalDir) {
      const bullishAligned = signalDir === 'BUY' && (crossover === 'bullish' || (histogramDirection === 'rising' && macdVal != null && macdVal > 0));
      const bearishAligned = signalDir === 'SELL' && (crossover === 'bearish' || (histogramDirection === 'falling' && macdVal != null && macdVal < 0));
      if (bullishAligned || bearishAligned) {
        contribution = crossover !== 'none' ? weight : Math.round(weight * 0.5);
      }
    }

    return { macd: macdVal, signal: signalVal, histogram: histVal, crossover, histogramDirection, confidenceContribution: contribution };
  } catch (err) {
    logger.error(`[nseService] MACD calculation failed err=${err instanceof Error ? err.message : err}`, err);
    return { macd: null, signal: null, histogram: null, crossover: 'none', histogramDirection: 'flat', confidenceContribution: 0 };
  }
}

// ---------------------------------------------------------------------------
// Volume Confirmation
// ---------------------------------------------------------------------------

function analyzeVolume(candles, signalDir) {
  const { volumeWeight: weight, volumeBreakoutMultiplier: breakoutMultiplier } = getTunables();

  if (candles.length < 5) {
    return { currentVolume: null, averageVolume: null, volumeRatio: null, confirmation: 'insufficient-data', confidenceContribution: 0 };
  }

  const lastCandle = candles[candles.length - 1];
  const currentVolume = lastCandle.volume ?? null;
  if (currentVolume == null || currentVolume === 0) {
    return { currentVolume, averageVolume: null, volumeRatio: null, confirmation: 'insufficient-data', confidenceContribution: 0 };
  }

  const lookbackCandles = candles.slice(-21, -1);
  const volumes = lookbackCandles.map((c) => c.volume ?? 0).filter((v) => v > 0);
  if (volumes.length === 0) {
    return { currentVolume, averageVolume: null, volumeRatio: null, confirmation: 'insufficient-data', confidenceContribution: 0 };
  }

  const averageVolume = volumes.reduce((s, v) => s + v, 0) / volumes.length;
  const volumeRatio = averageVolume > 0 ? currentVolume / averageVolume : null;

  let confirmation = 'normal';
  let contribution = Math.round(weight * 0.5);

  if (volumeRatio != null) {
    if (volumeRatio >= breakoutMultiplier) {
      confirmation = 'strong-breakout';
      contribution = weight;
    } else if (volumeRatio < 0.7) {
      confirmation = 'weak-move';
      contribution = 0;
    }
  }

  return { currentVolume, averageVolume: Math.round(averageVolume), volumeRatio: volumeRatio != null ? Number(volumeRatio.toFixed(2)) : null, confirmation, confidenceContribution: signalDir ? contribution : 0 };
}

// ---------------------------------------------------------------------------
// Candlestick Pattern Detection
// ---------------------------------------------------------------------------

function detectCandlePatterns(candles, signalDir) {
  const patterns = [];
  if (candles.length < 3) return { patterns, confidenceContribution: 0 };

  // Scan only the last 5 completed candles (skip the forming last candle)
  const window = candles.slice(-6, -1);
  const offset = candles.length - 6;

  for (let i = 0; i < window.length; i++) {
    const c = window[i];
    const prev = window[i - 1];
    const globalIdx = offset + i;

    const range = c.high - c.low;
    if (range <= 0) continue;
    const body = Math.abs(c.close - c.open);
    const upperWick = c.high - Math.max(c.close, c.open);
    const lowerWick = Math.min(c.close, c.open) - c.low;
    const bullishCandle = c.close > c.open;

    // Doji — body < 10% of range
    if (body / range < 0.1) {
      patterns.push({ name: 'doji', direction: 'bullish', strength: Math.round((1 - body / range) * 100), candleIndex: globalIdx, time: c.time });
    }

    // Hammer — small body at top, lower wick >= 2× body, upper wick small
    if (body > 0 && lowerWick >= 2 * body && upperWick <= 0.3 * body && bullishCandle) {
      patterns.push({ name: 'hammer', direction: 'bullish', strength: Math.min(100, Math.round((lowerWick / body) * 30)), candleIndex: globalIdx, time: c.time });
    }

    // Shooting Star / Inverted Hammer — small body at bottom, upper wick >= 2× body
    if (body > 0 && upperWick >= 2 * body && lowerWick <= 0.3 * body) {
      const name = !bullishCandle ? 'shooting_star' : 'inverted_hammer';
      const dir = name === 'shooting_star' ? 'bearish' : 'bullish';
      patterns.push({ name, direction: dir, strength: Math.min(100, Math.round((upperWick / body) * 30)), candleIndex: globalIdx, time: c.time });
    }

    // Marubozu — body >= 90% of range, minimal wicks
    if (body / range >= 0.9) {
      const name = bullishCandle ? 'bullish_marubozu' : 'bearish_marubozu';
      const dir = bullishCandle ? 'bullish' : 'bearish';
      patterns.push({ name, direction: dir, strength: Math.round((body / range) * 100), candleIndex: globalIdx, time: c.time });
    }

    // Engulfing — requires previous candle
    if (prev) {
      const prevBody = Math.abs(prev.close - prev.open);
      const prevBullish = prev.close > prev.open;
      // Bullish engulfing: prev bearish, current bullish, current body engulfs prev body
      if (!prevBullish && bullishCandle && c.open <= prev.close && c.close >= prev.open && body > prevBody) {
        patterns.push({ name: 'bullish_engulfing', direction: 'bullish', strength: Math.min(100, Math.round((body / prevBody) * 50)), candleIndex: globalIdx, time: c.time });
      }
      // Bearish engulfing: prev bullish, current bearish, current body engulfs prev body
      if (prevBullish && !bullishCandle && c.open >= prev.close && c.close <= prev.open && body > prevBody) {
        patterns.push({ name: 'bearish_engulfing', direction: 'bearish', strength: Math.min(100, Math.round((body / prevBody) * 50)), candleIndex: globalIdx, time: c.time });
      }
    }

    // Morning Star / Evening Star — 3 candle pattern
    if (i >= 2) {
      const first = window[i - 2];
      const mid = window[i - 1];
      const midBody = Math.abs(mid.close - mid.open);
      const midRange = mid.high - mid.low;
      const firstBody = Math.abs(first.close - first.open);
      const firstBearish = first.close < first.open;
      // Morning Star: first bearish large, mid small/doji, third bullish closing into first body
      if (firstBearish && bullishCandle && midRange > 0 && midBody / midRange < 0.3 && firstBody > 0 && c.close > (first.open + first.close) / 2) {
        patterns.push({ name: 'morning_star', direction: 'bullish', strength: 75, candleIndex: globalIdx, time: c.time });
      }
      // Evening Star: first bullish large, mid small/doji, third bearish closing into first body
      const firstBullish = first.close > first.open;
      if (firstBullish && !bullishCandle && midRange > 0 && midBody / midRange < 0.3 && firstBody > 0 && c.close < (first.open + first.close) / 2) {
        patterns.push({ name: 'evening_star', direction: 'bearish', strength: 75, candleIndex: globalIdx, time: c.time });
      }
    }
  }

  if (!signalDir) return { patterns, confidenceContribution: 0 };

  const aligned = patterns.filter(p => (signalDir === 'BUY' ? p.direction === 'bullish' : p.direction === 'bearish'));
  let contribution = 0;
  for (const p of aligned) {
    contribution += p.strength >= 60 ? 5 : 3;
  }
  return { patterns, confidenceContribution: Math.min(10, contribution) };
}

// ---------------------------------------------------------------------------
// Swing High/Low Support & Resistance
// ---------------------------------------------------------------------------

function detectSwingLevels(candles, options) {
  const lookback = options?.lookback ?? 3;
  const clusterTolerance = options?.clusterTolerance ?? 0.002;
  const maxLevels = options?.maxLevels ?? 6;

  if (candles.length < lookback * 2 + 1) return [];

  const rawHighs = [];
  const rawLows = [];

  for (let i = lookback; i < candles.length - lookback; i++) {
    const c = candles[i];
    let isSwingHigh = true;
    let isSwingLow = true;
    for (let j = i - lookback; j <= i + lookback; j++) {
      if (j === i) continue;
      if (candles[j].high >= c.high) isSwingHigh = false;
      if (candles[j].low <= c.low) isSwingLow = false;
    }
    if (isSwingHigh) rawHighs.push({ price: c.high, time: c.time });
    if (isSwingLow) rawLows.push({ price: c.low, time: c.time });
  }

  function cluster(points, type) {
    const levels = [];
    for (const pt of points) {
      const existing = levels.find(l => Math.abs(l.price - pt.price) / pt.price <= clusterTolerance);
      if (existing) {
        existing.price = (existing.price * existing.strength + pt.price) / (existing.strength + 1);
        existing.strength++;
        existing.touchTimes.push(pt.time);
      } else {
        levels.push({ price: Number(pt.price.toFixed(2)), type, strength: 1, touchTimes: [pt.time] });
      }
    }
    return levels.sort((a, b) => b.strength - a.strength).slice(0, maxLevels);
  }

  const resistanceLevels = cluster(rawHighs, 'resistance');
  const supportLevels = cluster(rawLows, 'support');

  return [...resistanceLevels, ...supportLevels]
    .sort((a, b) => b.strength - a.strength)
    .slice(0, maxLevels);
}

// ---------------------------------------------------------------------------
// Chart Analysis (candles + EMA series + S/R + patterns)
// ---------------------------------------------------------------------------

function buildEmaSeries(candles, period) {
  if (candles.length < period) return [];
  const closes = candles.map(c => c.close);
  const emaValues = ema({ period, values: closes });
  const result = [];
  const startIdx = period - 1;
  for (let i = 0; i < emaValues.length; i++) {
    const val = emaValues[i];
    if (typeof val === 'number' && !Number.isNaN(val)) {
      result.push({ time: candles[startIdx + i].time, value: Number(val.toFixed(2)) });
    }
  }
  return result;
}

async function getNiftyChartAnalysis(symbol = 'NIFTY') {
  const data = symbol === 'BANKNIFTY' ? await getBankNiftyCandles() : await getNiftyCandles();
  const candles = data.candles ?? [];

  const ema20Values = buildEmaSeries(candles, 20);
  const ema50Values = buildEmaSeries(candles, 50);

  let vwapValue = null;
  if (candles.length > 0) {
    let cumTpV = 0, cumV = 0;
    for (const c of candles) {
      const tp = (c.high + c.low + c.close) / 3;
      cumTpV += tp * (c.volume ?? 0);
      cumV += c.volume ?? 0;
    }
    vwapValue = cumV > 0 ? Number((cumTpV / cumV).toFixed(2)) : null;
  }

  const swingLevels = detectSwingLevels(candles);
  const { patterns } = detectCandlePatterns(candles);

  return { candles, ema20Values, ema50Values, vwapValue, swingLevels, patterns, symbol: `NSE:${symbol}`, resolution: '5m' };
}

// ---------------------------------------------------------------------------
// Market Regime Detection
// ---------------------------------------------------------------------------

function detectMarketRegime(price, ema20, ema50) {
  if (price == null || ema20 == null) {
    return { regime: 'sideways', reasons: ['Insufficient data for regime detection'] };
  }
  const reasons = [];

  if (ema50 != null && ema20 > ema50 && price > ema20) {
    reasons.push('EMA20 > EMA50, price > EMA20');
    return { regime: 'bullish', reasons };
  }
  if (ema50 != null && ema20 < ema50 && price < ema20) {
    reasons.push('EMA20 < EMA50, price < EMA20');
    return { regime: 'bearish', reasons };
  }
  // Weak trend: only price vs EMA20 (no EMA50 alignment)
  if (price > ema20) {
    reasons.push('Price > EMA20 but EMAs not aligned → sideways-to-bullish');
  } else if (price < ema20) {
    reasons.push('Price < EMA20 but EMAs not aligned → sideways-to-bearish');
  } else {
    reasons.push('Price near EMA20');
  }
  return { regime: 'sideways', reasons };
}

// ---------------------------------------------------------------------------
// Trade Mode — controls signal selectivity (runtime-settable via API)
// ---------------------------------------------------------------------------

let _tradeMode = getTunables().signalTradeMode;

function getTradeMode() {
  return _tradeMode;
}

function setTradeMode(mode) {
  _tradeMode = mode;
  logger.info(`[tradeMode] switched to: ${mode}`);
}

// ---------------------------------------------------------------------------
// ADX Trend Strength (v5)
// ---------------------------------------------------------------------------

const ADX_PERIOD = 14;
const ADX_MIN_TREND = 20;
const EMA_CONVERGENCE_PCT = 0.0015;
const MAX_CONSECUTIVE_LOSSES = 2;

function calculateAdx(candles) {
  if (candles.length < ADX_PERIOD + 1) return null;
  try {
    const result = ADX.calculate({
      high: candles.map(c => c.high),
      low: candles.map(c => c.low),
      close: candles.map(c => c.close),
      period: ADX_PERIOD,
    });
    if (result.length === 0) return null;
    const last = result[result.length - 1];
    if (last.adx == null || last.pdi == null || last.mdi == null) return null;
    return { adx: last.adx, pdi: last.pdi, mdi: last.mdi };
  } catch {
    return null;
  }
}

function getDynamicT1(adxValue) {
  if (adxValue == null || adxValue < 25) return 1.0;
  if (adxValue >= 35) return 1.5;
  return 1.2;
}

// ---------------------------------------------------------------------------
// Circuit Breaker (v5) — resets daily
// ---------------------------------------------------------------------------

let consecutiveSLCount = 0;
let circuitBreakerDate = '';

function checkCircuitBreaker() {
  const now = new Date();
  const todayIst = getIstDateString(Math.floor(now.getTime() / 1000));
  if (todayIst !== circuitBreakerDate) {
    circuitBreakerDate = todayIst;
    consecutiveSLCount = 0;
  }
  return consecutiveSLCount >= MAX_CONSECUTIVE_LOSSES;
}

function recordTradeExit(exitReason) {
  const now = new Date();
  const todayIst = getIstDateString(Math.floor(now.getTime() / 1000));
  if (todayIst !== circuitBreakerDate) {
    circuitBreakerDate = todayIst;
    consecutiveSLCount = 0;
  }
  if (exitReason === 'SL') {
    consecutiveSLCount++;
  } else if (exitReason === 'Target1' || exitReason === 'Target2') {
    consecutiveSLCount = 0;
  }
}

// ---------------------------------------------------------------------------
// Rule-Based Signal Evaluation
// ---------------------------------------------------------------------------

function evaluateRuleBasedSignal(input) {
  const { price, ema20, ema50, rsiVal, vwap, regime, macd, pdhPdl, cpr, bankBearish, bankBullish, adxState } = input;
  const reasons = [];
  const mode = getTradeMode();
  const minConfirmations = mode === 'medium' ? 3 : 4;

  // Dead zone checks (gate rules)
  const rsiEval = evaluateRsiDeadZone(rsiVal);
  const vwapEval = evaluateVwapDeadZone(price, vwap);
  if (rsiEval.inDeadZone) {
    reasons.push(`RSI in dead zone (delta ${rsiEval.delta != null ? rsiEval.delta.toFixed(2) : 'n/a'})`);
    return { signal: 'NO TRADE', reasons, confirmations: 0, qualityLevel: 'low' };
  }
  if (vwapEval.inDeadZone) {
    reasons.push(`VWAP in dead zone (delta ${vwapEval.delta != null ? vwapEval.delta.toFixed(2) : 'n/a'})`);
    return { signal: 'NO TRADE', reasons, confirmations: 0, qualityLevel: 'low' };
  }

  // Gate: EMA convergence chop filter
  if (ema20 != null && ema50 != null && price != null && price > 0) {
    if (Math.abs(ema20 - ema50) / price < EMA_CONVERGENCE_PCT) {
      reasons.push('EMA convergence (chop filter)');
      return { signal: 'NO TRADE', reasons, confirmations: 0, qualityLevel: 'low' };
    }
  }

  // ---- SELL (bearish) ----
  if (regime === 'bearish') {
    // Selective mode: extra gates — ADX strength + MDI dominance
    if (mode === 'selective') {
      if (adxState == null || adxState.adx < ADX_MIN_TREND) {
        reasons.push(`ADX too low (${adxState?.adx?.toFixed(1) ?? 'n/a'} < ${ADX_MIN_TREND})`);
        return { signal: 'NO TRADE', reasons, confirmations: 0, qualityLevel: 'low' };
      }
      if (adxState.mdi <= adxState.pdi) {
        reasons.push(`MDI not dominant (MDI ${adxState.mdi.toFixed(1)} <= PDI ${adxState.pdi.toFixed(1)})`);
        return { signal: 'NO TRADE', reasons, confirmations: 0, qualityLevel: 'low' };
      }
    }

    const macdBearish = macd.crossover === 'bearish' ||
      (macd.histogramDirection === 'falling' && macd.macd != null && macd.macd < 0);

    if (macdBearish) {
      const adxLabel = adxState != null ? ` ADX: ${adxState.adx.toFixed(1)}` : '';
      reasons.push('Regime: bearish', `MACD confirms bearish${adxLabel}`);
      let confirmations = 0;

      if (pdhPdl?.breakout === 'below-pdl') { confirmations++; reasons.push('PDL breakout'); }
      if (cpr?.dayType === 'trending' && cpr?.priceRelation === 'below-bc') { confirmations++; reasons.push('CPR trending + below BC'); }
      if (bankBearish) { confirmations++; reasons.push('BANKNIFTY bearish confirmation'); }
      if (rsiEval.direction === 'bearish' && rsiVal != null && rsiVal < 40) { confirmations++; reasons.push(`RSI bearish (${rsiVal.toFixed(1)})`); }
      if (vwapEval.direction === 'bearish') { confirmations++; reasons.push('Below VWAP'); }
      const bearishPatterns = detectCandlePatterns(input.candles, 'SELL');
      if (bearishPatterns.confidenceContribution > 0) { confirmations++; reasons.push(`Pattern: ${bearishPatterns.patterns.filter(p => p.direction === 'bearish').map(p => p.name).join(', ')}`); }

      if (confirmations >= minConfirmations) {
        const qualityLevel = confirmations >= 4 ? 'high' : 'medium';
        return { signal: 'SELL', reasons, confirmations, qualityLevel };
      }
      reasons.push(`MACD bearish but insufficient confirmations (need ${minConfirmations}+)`);
    }
  }

  // ---- BUY (bullish) ----
  if (regime === 'bullish') {
    // Selective mode: extra gates — ADX strength + PDI dominance
    if (mode === 'selective') {
      if (adxState == null || adxState.adx < ADX_MIN_TREND) {
        reasons.push(`ADX too low (${adxState?.adx?.toFixed(1) ?? 'n/a'} < ${ADX_MIN_TREND})`);
        return { signal: 'NO TRADE', reasons, confirmations: 0, qualityLevel: 'low' };
      }
      if (adxState.pdi <= adxState.mdi) {
        reasons.push(`PDI not dominant (PDI ${adxState.pdi.toFixed(1)} <= MDI ${adxState.mdi.toFixed(1)})`);
        return { signal: 'NO TRADE', reasons, confirmations: 0, qualityLevel: 'low' };
      }
    }

    const macdBullish = macd.crossover === 'bullish' ||
      (macd.histogramDirection === 'rising' && macd.macd != null && macd.macd > 0);

    if (macdBullish) {
      const adxLabel = adxState != null ? ` ADX: ${adxState.adx.toFixed(1)}` : '';
      reasons.push('Regime: bullish', `MACD confirms bullish${adxLabel}`);
      let confirmations = 0;

      if (pdhPdl?.breakout === 'above-pdh') { confirmations++; reasons.push('PDH breakout'); }
      if (cpr?.dayType === 'trending' && cpr?.priceRelation === 'above-tc') { confirmations++; reasons.push('CPR trending + above TC'); }
      if (bankBullish) { confirmations++; reasons.push('BANKNIFTY bullish confirmation'); }
      if (rsiEval.direction === 'bullish' && rsiVal != null && rsiVal > 60) { confirmations++; reasons.push(`RSI bullish (${rsiVal.toFixed(1)})`); }
      if (vwapEval.direction === 'bullish') { confirmations++; reasons.push('Above VWAP'); }
      const bullishPatterns = detectCandlePatterns(input.candles, 'BUY');
      if (bullishPatterns.confidenceContribution > 0) { confirmations++; reasons.push(`Pattern: ${bullishPatterns.patterns.filter(p => p.direction === 'bullish').map(p => p.name).join(', ')}`); }

      if (confirmations >= minConfirmations) {
        const qualityLevel = confirmations >= 4 ? 'high' : 'medium';
        return { signal: 'BUY', reasons, confirmations, qualityLevel };
      }
      reasons.push(`MACD bullish but insufficient confirmations (need ${minConfirmations}+)`);
    }
  }

  // No signal
  if (regime === 'sideways') {
    reasons.push('Sideways regime → no trade');
  } else {
    reasons.push(`Regime ${regime} but entry rules not met`);
  }
  return { signal: 'NO TRADE', reasons, confirmations: 0, qualityLevel: 'low' };
}

// ---------------------------------------------------------------------------
// Daily Trade Counter (resets each IST trading day)
// ---------------------------------------------------------------------------

const MAX_TRADES_PER_DAY = 2;
let dailyTradeCount = 0;
let dailyTradeDate = '';
let lastSlTimestamp = 0; // for 30-min cooldown after SL

function checkAndIncrementTradeCounter() {
  const now = new Date();
  const todayIst = getIstDateString(Math.floor(now.getTime() / 1000));
  if (todayIst !== dailyTradeDate) {
    dailyTradeDate = todayIst;
    dailyTradeCount = 0;
  }
  if (dailyTradeCount >= MAX_TRADES_PER_DAY) {
    return { allowed: false, count: dailyTradeCount };
  }
  dailyTradeCount++;
  return { allowed: true, count: dailyTradeCount };
}

function evaluateTrendSignal({ label, price, ema20, ema50, rsiVal, vwap, confirmationBearish, confirmationBullish, confirmationLabel }) {
  const reasons = [];
  const rsiEvaluation = evaluateRsiDeadZone(rsiVal);
  const vwapEvaluation = evaluateVwapDeadZone(price, vwap);

  logger.info(`[${label}] dead zone evaluation price=${price} ema20=${ema20} ema50=${ema50} rsi=${rsiVal} vwap=${vwap} rsiEvaluation=${JSON.stringify(rsiEvaluation)} vwapEvaluation=${JSON.stringify(vwapEvaluation)}`);
  logger.info(`[${label}] indicator trend evaluation price=${price} ema20=${ema20} ema50=${ema50} confirmationBearish=${confirmationBearish} confirmationBullish=${confirmationBullish}`);

  if (rsiEvaluation.inDeadZone) {
    reasons.push(`RSI in dead zone (delta ${rsiEvaluation.delta != null ? rsiEvaluation.delta.toFixed(2) : 'n/a'}, threshold ${Number(rsiEvaluation.threshold).toFixed(2)})`);
  }
  if (vwapEvaluation.inDeadZone) {
    reasons.push(`VWAP in dead zone (delta ${vwapEvaluation.delta != null ? vwapEvaluation.delta.toFixed(2) : 'n/a'}, threshold ${Number(vwapEvaluation.threshold).toFixed(2)})`);
  }
  if (rsiEvaluation.inDeadZone || vwapEvaluation.inDeadZone) {
    return { signal: 'NO TRADE', rawConfidence: 0, reasons };
  }

  const priceBelowEma20 = price != null && ema20 != null && price < ema20;
  const priceAboveEma20 = price != null && ema20 != null && price > ema20;
  const bearishRsi = rsiEvaluation.direction === 'bearish';
  const bullishRsi = rsiEvaluation.direction === 'bullish';
  const belowVwap = vwapEvaluation.direction === 'bearish';
  const aboveVwap = vwapEvaluation.direction === 'bullish';

  if (priceBelowEma20 && bearishRsi && belowVwap && confirmationBearish) {
    reasons.push(`${label} below EMA20`, 'RSI bearish', 'Price below VWAP', confirmationLabel);
    const confidence =
      25 + (ema50 != null && ema20 < ema50 ? 25 : 0) + (rsiVal != null && rsiVal < 35 ? 15 : 0) + 20;
    return { signal: 'SELL', rawConfidence: Math.min(85, confidence), reasons };
  }

  if (priceAboveEma20 && bullishRsi && aboveVwap && confirmationBullish) {
    reasons.push(`${label} above EMA20`, 'RSI bullish', 'Price above VWAP', confirmationLabel);
    const confidence =
      25 + (ema50 != null && ema20 > ema50 ? 25 : 0) + (rsiVal != null && rsiVal > 65 ? 15 : 0) + 20;
    return { signal: 'BUY', rawConfidence: Math.min(85, confidence), reasons };
  }

  if (priceBelowEma20 && confirmationBearish) {
    reasons.push(`${label} bearish but RSI/VWAP dead-zone rules not fully aligned`);
  } else if (priceAboveEma20 && confirmationBullish) {
    reasons.push(`${label} bullish but RSI/VWAP dead-zone rules not fully aligned`);
  } else {
    reasons.push('Conditions not met for PE or CE');
  }

  return { signal: 'NO TRADE', rawConfidence: 0, reasons };
}

/**
 * Rule-based NIFTY trade signal engine.
 */
async function getNiftyTradeSignal(windowSize = DEFAULT_INDICATOR_WINDOW_SIZE) {
  const noTradeResult = (reason, extras) => ({
    signal: 'NO TRADE', trade: 'NO TRADE', entry: null, stopLoss: null, target1: null, target2: null,
    rawConfidence: 0, confidence: 0, weightedConfidence: 0, pcrWeight: null, atr: null, reason, ...extras,
  });

  try {
    // ---- Step 1: Fetch candle data ----
    const [nifty, bank] = await Promise.all([
      getNiftyCandles(windowSize),
      getBankNiftyCandles(windowSize),
    ]);

    const price = nifty.latestClosePrice ?? null;
    const ema20 = nifty.ema20 ?? null;
    const ema50 = nifty.ema50 ?? null;
    const vwap = nifty.vwap ?? null;
    const rsiVal = nifty.rsi ?? null;
    const candles = nifty.candles ?? [];
    const atr = calculateAtr(candles);

    const bankPrice = bank.latestClosePrice ?? null;
    const bankEma20 = bank.ema20 ?? null;
    const bankBearish = bankPrice != null && bankEma20 != null && bankPrice < bankEma20;
    const bankBullish = bankPrice != null && bankEma20 != null && bankPrice > bankEma20;

    // ---- Step 2: Compute sync indicators from candle data ----
    const prevDayLevels = extractPreviousDayLevels(candles);
    const superTrendResult = calculateSuperTrend(candles);
    const macdResult = calculateMacd(candles);
    const volumeResult = analyzeVolume(candles);
    const adxState = calculateAdx(candles);

    // ---- Step 3: Market regime detection ----
    const { regime, reasons: regimeReasons } = detectMarketRegime(price, ema20, ema50);
    logger.info(`[NIFTY] Market regime regime=${regime} regimeReasons=${JSON.stringify(regimeReasons)}`);

    // ---- Step 4: Compute PDH/PDL and CPR (needed for rule evaluation) ----
    const pdhPdlForRules = evaluatePdhPdl(price, prevDayLevels, 'BUY');
    let cprForRules = null;
    if (prevDayLevels.pdh != null && prevDayLevels.pdl != null && prevDayLevels.pdc != null && price != null) {
      cprForRules = calculateCpr(prevDayLevels.pdh, prevDayLevels.pdl, prevDayLevels.pdc, price, 'BUY');
    }

    // ---- Step 5: Rule-based signal evaluation ----
    const ruleResult = evaluateRuleBasedSignal({
      price, ema20, ema50, rsiVal, vwap,
      regime,
      macd: macdResult,
      pdhPdl: pdhPdlForRules,
      cpr: cprForRules,
      bankBearish, bankBullish,
      adxState,
      candles,
    });

    const signal = ruleResult.signal;

    if (signal === 'NO TRADE') {
      return noTradeResult(ruleResult.reasons.join('. '), {
        atr,
        superTrendDirection: superTrendResult.direction,
        macdCrossover: macdResult.crossover,
        volumeConfirmation: volumeResult.confirmation,
        pdh: prevDayLevels.pdh, pdl: prevDayLevels.pdl, pdc: prevDayLevels.pdc,
        cprDayType: cprForRules?.dayType ?? null,
        cprPivot: cprForRules?.pivot ?? null,
      });
    }

    // ---- Step 6: Gate rules ----

    // ATR volatility filter: skip whipsaw (>0.6% of price) and dead markets (<0.2%)
    if (atr != null && price != null && price > 0) {
      const atrPct = (atr / price) * 100;
      if (atrPct > 0.6) {
        return noTradeResult(`ATR too high (${atrPct.toFixed(2)}% > 0.6%) — whipsaw risk`, { atr });
      }
      if (atrPct < 0.2) {
        return noTradeResult(`ATR too low (${atrPct.toFixed(2)}% < 0.2%) — no movement`, { atr });
      }
    }

    // Session filter
    const sessionResult = evaluateMarketSession();
    if (!sessionResult.allowed) {
      return noTradeResult(`Session blocked: ${sessionResult.reason}`, {
        sessionAllowed: false, sessionInfo: sessionResult.reason, atr,
        superTrendDirection: superTrendResult.direction,
        macdCrossover: macdResult.crossover,
      });
    }

    // Circuit breaker: stop after consecutive losses
    if (checkCircuitBreaker()) {
      return noTradeResult(`Circuit breaker: ${MAX_CONSECUTIVE_LOSSES} consecutive SL hits today`, {
        sessionAllowed: true, sessionInfo: sessionResult.reason, atr,
      });
    }

    // 30-min cooldown after SL hit
    if (lastSlTimestamp > 0 && (Date.now() - lastSlTimestamp) < 30 * 60 * 1000) {
      return noTradeResult('Cooldown: 30 min after last SL hit', {
        sessionAllowed: true, sessionInfo: sessionResult.reason, atr,
      });
    }

    // Daily trade limit
    const tradeCounter = checkAndIncrementTradeCounter();
    if (!tradeCounter.allowed) {
      return noTradeResult(`Daily trade limit reached (${tradeCounter.count}/${MAX_TRADES_PER_DAY})`, {
        sessionAllowed: true, sessionInfo: sessionResult.reason, atr,
        superTrendDirection: superTrendResult.direction,
        macdCrossover: macdResult.crossover,
      });
    }

    // ---- Step 7: Fetch async data in parallel (VIX as gate + display data) ----
    const [vixResult, maxPainResult, oiSrResult, oiChangeResult] = await Promise.all([
      getIndiaVix().catch(() => ({ vixValue: null, tradingAllowed: true, vixZone: 'normal', slAdjustmentFactor: 1, confidenceContribution: 0 })),
      calculateMaxPain(signal).catch(() => ({ maxPainStrike: 0, spotPrice: 0, distanceFromSpot: 0, distancePct: 0, direction: 'at-spot', confidenceContribution: 0, isExpiryDay: false })),
      getOiBasedSupportResistance(signal).catch(() => ({ support: { strike: 0, peOi: 0 }, resistance: { strike: 0, ceOi: 0 }, spotPrice: 0, priceRelation: 'between-levels', confidenceContribution: 0 })),
      getOiChangeAnalysis().catch(() => ({ atmStrike: null, changes: [], overallBias: 'neutral', confidenceContribution: 0 })),
    ]);

    // VIX gate check
    if (!vixResult.tradingAllowed) {
      // Roll back trade counter since we're not actually trading
      dailyTradeCount = Math.max(0, dailyTradeCount - 1);
      return noTradeResult(`VIX blocked: India VIX ${vixResult.vixValue?.toFixed(2) ?? 'n/a'} is ${vixResult.vixZone}`, {
        vix: vixResult.vixValue, sessionAllowed: true, atr,
        superTrendDirection: superTrendResult.direction,
      });
    }

    // ---- Step 8: Build confidence from rule quality ----
    const qualityConfidence = ruleResult.qualityLevel === 'high' ? 85 :
                              ruleResult.qualityLevel === 'medium' ? 70 : 55;

    // Build breakdown for display (backward-compatible)
    const pdhPdlResult = evaluatePdhPdl(price, prevDayLevels, signal);
    let cprResult = null;
    if (prevDayLevels.pdh != null && prevDayLevels.pdl != null && prevDayLevels.pdc != null && price != null) {
      cprResult = calculateCpr(prevDayLevels.pdh, prevDayLevels.pdl, prevDayLevels.pdc, price, signal);
    }

    const emaScore = (ema50 != null && ema20 != null && ((signal === 'BUY' && ema20 > ema50) || (signal === 'SELL' && ema20 < ema50))) ? 15 : 8;
    const rsiScore = (rsiVal != null && ((signal === 'BUY' && rsiVal > 65) || (signal === 'SELL' && rsiVal < 35))) ? 10 : 5;
    const vwapScore = (price != null && vwap != null && ((signal === 'BUY' && price > vwap) || (signal === 'SELL' && price < vwap))) ? 7 : 0;
    const bankScore = (signal === 'BUY' && bankBullish) || (signal === 'SELL' && bankBearish) ? 10 : 0;
    const macdScore = macdResult.crossover !== 'none' ? 8 : (macdResult.histogramDirection !== 'flat' ? 4 : 0);

    const breakdown = {
      emaScore,
      rsiScore,
      vwapScore,
      bankConfirmation: bankScore,
      pcrScore: 0,
      vixScore: vixResult.confidenceContribution,
      superTrendScore: superTrendResult.direction === (signal === 'BUY' ? 'UP' : 'DOWN') ? 5 : 0,
      macdScore,
      oiChangeScore: 0,
      volumeScore: 0,
      maxPainScore: 0,
      pdhPdlScore: pdhPdlResult?.confidenceContribution ?? 0,
      cprScore: cprResult?.confidenceContribution ?? 0,
      oiSrScore: 0,
      patternScore: detectCandlePatterns(candles, signal).confidenceContribution,
      totalScore: 0,
      normalizedConfidence: qualityConfidence,
      vixBlocked: false,
      sessionBlocked: false,
    };
    breakdown.totalScore = Object.entries(breakdown)
      .filter(([k]) => k.endsWith('Score') && k !== 'totalScore')
      .reduce((sum, [, v]) => sum + v, 0);

    // ---- Step 9: Get option quote and compute entry/SL/targets ----
    const optionType = signal === 'BUY' ? 'CE' : 'PE';
    const optionQuote = await getNiftyAtmOptionQuote(optionType);
    const entry = Number(optionQuote.premium.toFixed(2));

    // VIX-adjusted stop loss
    const slPct = Math.max(0.6, Math.min(0.8, 0.7 * (2 - vixResult.slAdjustmentFactor)));
    const stopLoss = Number((entry * slPct).toFixed(2));
    const risk = Number((entry - stopLoss).toFixed(2));

    // Dynamic T1 based on ADX strength, T2 stays at 1.8R
    const dynamicT1 = getDynamicT1(adxState?.adx ?? null);
    const target1 = Number((entry + risk * dynamicT1).toFixed(2));
    const target2 = Number((entry + risk * 1.8).toFixed(2));

    // ---- Step 10: Build reason string ----
    const reasonParts = [...ruleResult.reasons];
    reasonParts.push(`Quality: ${ruleResult.qualityLevel} (${ruleResult.confirmations} confirmations)`);
    if (vixResult.vixValue != null) reasonParts.push(`VIX: ${vixResult.vixValue.toFixed(1)} (${vixResult.vixZone})`);
    if (oiChangeResult.overallBias !== 'neutral') reasonParts.push(`OI Change: ${oiChangeResult.overallBias}`);
    if (maxPainResult.maxPainStrike > 0) reasonParts.push(`Max Pain: ${maxPainResult.maxPainStrike} (${maxPainResult.direction})`);
    if (oiSrResult.support.strike > 0) reasonParts.push(`OI S/R: Sup ${oiSrResult.support.strike} / Res ${oiSrResult.resistance.strike}`);
    reasonParts.push(`Trade ${tradeCounter.count}/${MAX_TRADES_PER_DAY} today`);
    reasonParts.push(`Selected ${optionQuote.trade} for expiry ${optionQuote.selectedExpiry}`);
    const tradeReason = reasonParts.join('. ');

    logger.info(`Rule-based trade signal generated signal=${signal} regime=${regime} quality=${ruleResult.qualityLevel} confirmations=${ruleResult.confirmations} trade=${optionQuote.trade} entry=${entry} stopLoss=${stopLoss} target1=${target1} target2=${target2} confidence=${qualityConfidence} atr=${atr} tradeCount=${tradeCounter.count}`);

    return {
      signal,
      trade: optionQuote.trade,
      entry,
      stopLoss,
      target1,
      target2,
      rawConfidence: qualityConfidence,
      confidence: qualityConfidence,
      weightedConfidence: qualityConfidence,
      pcrWeight: null,
      atr,
      reason: tradeReason,
      breakdown,
      vix: vixResult.vixValue,
      superTrendDirection: superTrendResult.direction,
      macdCrossover: macdResult.crossover,
      oiChangeBias: oiChangeResult.overallBias,
      maxPainStrike: maxPainResult.maxPainStrike || null,
      maxPainDirection: maxPainResult.direction,
      cprDayType: cprResult?.dayType ?? null,
      cprPivot: cprResult?.pivot ?? null,
      pdh: prevDayLevels.pdh,
      pdl: prevDayLevels.pdl,
      pdc: prevDayLevels.pdc,
      oiSupport: oiSrResult.support.strike || null,
      oiResistance: oiSrResult.resistance.strike || null,
      sessionAllowed: true,
      sessionInfo: sessionResult.reason,
      volumeConfirmation: volumeResult.confirmation,
      regime,
      qualityLevel: ruleResult.qualityLevel,
      tradesToday: tradeCounter.count,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`[nseService] getNiftyTradeSignal failed message=${message}`, err);
    return {
      signal: 'NO TRADE', trade: 'NO TRADE', entry: null, stopLoss: null,
      target1: null, target2: null, rawConfidence: 0, confidence: 0,
      weightedConfidence: 0, pcrWeight: null, atr: null, reason: `Error: ${message}`,
    };
  }
}

async function getBankNiftyTradeSignal(windowSize = DEFAULT_INDICATOR_WINDOW_SIZE) {
  try {
    const bank = await getBankNiftyCandles(windowSize);
    const signalEvaluation = evaluateTrendSignal({
      label: 'BANKNIFTY',
      price: bank.latestClosePrice ?? null,
      ema20: bank.ema20 ?? null,
      ema50: bank.ema50 ?? null,
      rsiVal: bank.rsi ?? null,
      vwap: bank.vwap ?? null,
      confirmationBearish: bank.latestClosePrice != null && bank.ema50 != null && bank.latestClosePrice < bank.ema50,
      confirmationBullish: bank.latestClosePrice != null && bank.ema50 != null && bank.latestClosePrice > bank.ema50,
      confirmationLabel: 'BANKNIFTY trend confirmation',
    });

    const signal = signalEvaluation.signal;
    const reason = signalEvaluation.reasons.join('. ');
    const rawConfidence = Math.min(100, Math.round(signalEvaluation.rawConfidence));
    const atr = calculateAtr(bank.candles ?? []);

    if (signal === 'NO TRADE') {
      return {
        signal, trade: 'NO TRADE', entry: null, stopLoss: null, target1: null, target2: null,
        rawConfidence, confidence: 0, weightedConfidence: 0, pcrWeight: null, atr, reason,
      };
    }

    return {
      signal,
      trade: signal === 'BUY' ? 'BUY BANKNIFTY CE' : 'BUY BANKNIFTY PE',
      entry: null, stopLoss: null, target1: null, target2: null,
      rawConfidence, confidence: rawConfidence, weightedConfidence: rawConfidence,
      pcrWeight: null, atr, reason,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`[nseService] getBankNiftyTradeSignal failed message=${message}`, err);
    return {
      signal: 'NO TRADE', trade: 'NO TRADE', entry: null, stopLoss: null, target1: null, target2: null,
      rawConfidence: 0, confidence: 0, weightedConfidence: 0, pcrWeight: null, atr: null,
      reason: `Error: ${message}`,
    };
  }
}

/**
 * Fetches NIFTY option chain from Yahoo Finance API for symbol ^NSEI.
 */
async function getNiftyOptions() {
  try {
    logger.info(`Fetching NIFTY options from Yahoo Finance`);
    const response = await axios.get(YAHOO_OPTIONS_URL, {
      timeout: 15000,
      validateStatus: () => true,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        Accept: 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        Referer: 'https://finance.yahoo.com/',
      },
    });

    if (response.status !== 200) {
      logger.error(`[nseService] getNiftyOptions: Yahoo API status ${response.status}`);
      return {
        underlyingPrice: null, firstExpiryDate: null, numberOfStrikes: 0,
        symbol: YAHOO_NIFTY_SYMBOL, error: `Yahoo Finance API returned ${response.status}`,
      };
    }

    const result = response.data?.optionChain?.result?.[0];
    if (!result) {
      logger.error(`[nseService] getNiftyOptions: no optionChain result`);
      return {
        underlyingPrice: null, firstExpiryDate: null, numberOfStrikes: 0,
        symbol: YAHOO_NIFTY_SYMBOL, error: 'No option chain data in response',
      };
    }

    const quote = result.quote;
    const underlyingPrice = quote?.regularMarketPrice ?? quote?.regularMarketPreviousClose ?? null;

    const expirationDates = result.expirationDates ?? [];
    const firstExpiryTs = expirationDates.length > 0 ? expirationDates[0] : null;
    const firstExpiryDate =
      firstExpiryTs != null ? new Date(firstExpiryTs * 1000).toISOString().slice(0, 10) : null;

    const strikes = result.strikes ?? [];
    const numberOfStrikes = strikes.length;

    return { underlyingPrice, firstExpiryDate, numberOfStrikes, symbol: YAHOO_NIFTY_SYMBOL };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`[nseService] getNiftyOptions failed message=${message}`, err);
    return {
      underlyingPrice: null, firstExpiryDate: null, numberOfStrikes: 0,
      symbol: YAHOO_NIFTY_SYMBOL, error: message,
    };
  }
}

/**
 * Fetches NSE session cookies by loading the homepage (required for API access).
 */
async function getNseCookies() {
  const res = await axios.get(NSE_ORIGIN, {
    headers: defaultHeaders,
    timeout: 10000,
    maxRedirects: 5,
    validateStatus: () => true,
  });
  const setCookie = res.headers['set-cookie'];
  if (!setCookie || !Array.isArray(setCookie)) return '';
  return setCookie.map((c) => c.split(';')[0].trim()).join('; ');
}

/**
 * Creates an axios instance for NSE with default headers.
 */
function createNseClient(cookie) {
  return axios.create({
    baseURL: NSE_ORIGIN,
    headers: {
      ...defaultHeaders,
      ...(cookie ? { Cookie: cookie } : {}),
    },
    timeout: 20000,
    maxRedirects: 5,
    validateStatus: () => true,
  });
}

/**
 * Fetches live NIFTY 50 price from NSE India via equity-stockIndices API.
 */
async function getNiftyPrice() {
  const spot = await getNiftySpotFromZerodha();
  return { lastPrice: spot, change: 0, pChange: 0, dayHigh: spot, dayLow: spot, lastUpdateTime: new Date().toLocaleString('en-IN') };
}

/**
 * Fetches live NIFTY BANK (BANKNIFTY) price from NSE India via equity-stockIndices API.
 */
async function getBankNiftyPrice() {
  const to = Math.floor(Date.now() / 1000);
  const from = to - 30 * 60; // last 30 min is enough for latest price
  const candles = await fetchHistoricalCandles('BANKNIFTY', from, to);
  if (!candles.length) throw new Error('BANKNIFTY price unavailable from Zerodha');
  const spot = candles[candles.length - 1].close;
  return { lastPrice: spot, change: 0, pChange: 0, dayHigh: spot, dayLow: spot, lastUpdateTime: new Date().toLocaleString('en-IN') };
}

/**
 * Fetches raw NSE quote-equity response and returns first 20 keys + sample for debugging.
 */
async function debugNiftyRaw() {
  try {
    const cookie = await getNseCookies();
    const client = axios.create({
      baseURL: NSE_ORIGIN,
      headers: { ...defaultHeaders, ...(cookie ? { Cookie: cookie } : {}) },
      timeout: 15000,
      maxRedirects: 5,
      validateStatus: () => true,
    });

    const response = await client.get(NSE_QUOTE_URL, {
      headers: { ...defaultHeaders, Referer: `${NSE_ORIGIN}/get-quotes/equity?symbol=NIFTY%2050`, ...(cookie ? { Cookie: cookie } : {}) },
    });

    const data = response.data ?? {};
    const keys = Object.keys(data);
    const first20Keys = keys.slice(0, 20);
    const sample = {};
    for (const k of first20Keys) {
      sample[k] = data[k];
    }

    return { keys: first20Keys, sample, statusCode: response.status };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`[nseService] debugNiftyRaw failed message=${message}`, err);
    return { keys: [], sample: {}, error: message };
  }
}

/**
 * Fetches NSE equity-stockIndices for NIFTY 50 and returns first data item + its keys for debugging.
 */
async function debugNiftyIndices() {
  try {
    const cookie = await getNseCookies();
    const client = axios.create({
      baseURL: NSE_ORIGIN,
      headers: { ...defaultHeaders, ...(cookie ? { Cookie: cookie } : {}) },
      timeout: 15000,
      maxRedirects: 5,
      validateStatus: () => true,
    });

    const response = await client.get(NSE_INDICES_NIFTY_URL, {
      headers: { ...defaultHeaders, Referer: `${NSE_ORIGIN}/`, ...(cookie ? { Cookie: cookie } : {}) },
    });

    const body = response.data;
    const dataArray = Array.isArray(body) ? body : (body && typeof body === 'object' && 'data' in body) ? body.data : undefined;
    const firstItem = Array.isArray(dataArray) && dataArray.length > 0 ? dataArray[0] : null;
    const firstItemKeys = firstItem ? Object.keys(firstItem) : [];

    return { firstItem, firstItemKeys, statusCode: response.status };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`[nseService] debugNiftyIndices failed message=${message}`, err);
    return { firstItem: null, firstItemKeys: [], error: message };
  }
}

/**
 * Fetches NSE option chain for NIFTY and returns underlyingValue, first expiry, record count, and first CE keys for debugging.
 */
async function debugNiftyOptionChain() {
  try {
    logger.info(`Initializing NSE session`);
    const nseClient = createNseClient();
    const sessionRes = await nseClient.get(NSE_ORIGIN);
    const setCookie = sessionRes.headers['set-cookie'];
    const cookie = setCookie && Array.isArray(setCookie)
      ? setCookie.map((c) => c.split(';')[0].trim()).join('; ')
      : '';

    logger.info(`Fetching option chain after session`);
    let response = await nseClient.get(NSE_OPTION_CHAIN_NIFTY_URL, {
      headers: { ...defaultHeaders, Referer: `${NSE_ORIGIN}/option-chain`, ...(cookie ? { Cookie: cookie } : {}) },
    });

    let data = response.data;
    const hasData = data && typeof data === 'object' && !Array.isArray(data) && Object.keys(data).length > 0;
    if (!hasData) {
      logger.info(`Retrying option chain with browser headers`);
      response = await nseClient.get(NSE_OPTION_CHAIN_NIFTY_URL, {
        headers: { ...optionChainBrowserHeaders, ...(cookie ? { Cookie: cookie } : {}) },
      });
      data = response.data;
    }

    const recordsObj = data?.records;
    const underlyingValue = data?.underlyingValue ?? recordsObj?.underlyingValue ?? null;
    const expiryDates = data?.expiryDates ?? recordsObj?.expiryDates;
    const firstExpiryDate = Array.isArray(expiryDates) && expiryDates.length > 0 ? expiryDates[0] : null;

    const records = recordsObj?.data ?? data?.data;
    const recordList = Array.isArray(records) ? records : [];
    const totalRecords = recordList.length;

    let firstCEKeys = [];
    const firstRecordWithCE = recordList.find((r) => r?.CE && typeof r.CE === 'object');
    if (firstRecordWithCE?.CE) {
      firstCEKeys = Object.keys(firstRecordWithCE.CE);
    }

    const responseKeys = data && typeof data === 'object' && !Array.isArray(data) ? Object.keys(data) : [];

    return {
      underlyingValue: underlyingValue ?? null,
      firstExpiryDate,
      totalRecords,
      firstCEKeys,
      responseTopLevelKeys: responseKeys,
      responseKeys,
      recordCount: totalRecords,
      statusCode: response.status,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`[nseService] debugNiftyOptionChain failed message=${message}`, err);
    return { underlyingValue: null, firstExpiryDate: null, totalRecords: 0, recordCount: 0, firstCEKeys: [], responseKeys: [], error: message };
  }
}

/**
 * Fetches NSE option chain for NIFTY with responseType: "text". Does not parse JSON.
 */
async function debugNiftyOptionChainRaw() {
  try {
    logger.info(`Initializing NSE session`);
    const nseClient = createNseClient();
    const sessionRes = await nseClient.get(NSE_ORIGIN);
    const setCookie = sessionRes.headers['set-cookie'];
    const cookie = setCookie && Array.isArray(setCookie)
      ? setCookie.map((c) => c.split(';')[0].trim()).join('; ')
      : '';

    logger.info(`Fetching option chain after session`);
    const response = await nseClient.get(NSE_OPTION_CHAIN_NIFTY_URL, {
      responseType: 'text',
      headers: { ...defaultHeaders, Referer: `${NSE_ORIGIN}/option-chain`, ...(cookie ? { Cookie: cookie } : {}) },
    });

    const rawBody = typeof response.data === 'string' ? response.data : String(response.data);
    const responseLength = rawBody.length;
    logger.info(`Raw option chain response length ${responseLength}`);

    const rawPreview = rawBody.slice(0, 800);

    return { rawPreview, responseLength, statusCode: response.status };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`[nseService] debugNiftyOptionChainRaw failed message=${message}`, err);
    return { rawPreview: '', responseLength: 0, error: message };
  }
}

/**
 * Fetches NIFTY PCR from Zerodha option OI (ATM ±5 strikes, nearest expiry).
 */
async function getNiftyPcr() {
  try {
    const data = await getNiftyPcrFromZerodha();
    return {
      totalCE_OI: data.totalCE_OI,
      totalPE_OI: data.totalPE_OI,
      pcr: data.pcr,
      interpretation: data.interpretation,
      error: data.error,
      verification: data.verification,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`[nseService] getNiftyPcr failed message=${message}`, err);
    throw err;
  }
}

module.exports = {
  getNiftyPrice,
  getBankNiftyPrice,
  getNiftyOptions,
  getNiftyCandles,
  getBankNiftyCandles,
  getNiftyMarketBias,
  getNiftyPcr,
  getNiftyTradeSignal,
  getBankNiftyTradeSignal,
  getIndiaVix,
  calculateSuperTrend,
  calculateMacd,
  calculateAdx,
  analyzeVolume,
  extractPreviousDayLevels,
  calculateCpr,
  evaluatePdhPdl,
  detectMarketRegime,
  detectSwingLevels,
  detectCandlePatterns,
  getNiftyChartAnalysis,
  debugNiftyRaw,
  debugNiftyIndices,
  debugNiftyOptionChain,
  debugNiftyOptionChainRaw,
  getTradeMode,
  setTradeMode,
  recordTradeExit,
};
