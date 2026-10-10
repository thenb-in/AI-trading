'use strict';
const logger = require('@startup/logger');
const { NIFTY_STRIKE_STEP, getNearestExpiryNiftyOptions } = require('./zerodhaInstruments');
const { getOptionQuotesByTradingSymbols } = require('./zerodhaQuotes');
const { getTunables } = require('@appServer/src/config/tradingConfig');

// ---------------------------------------------------------------------------
// Max Pain Calculation
// ---------------------------------------------------------------------------

async function calculateMaxPain(signalDir) {
  const weight = getTunables().maxPainWeight;

  try {
    const optionSlice = await getNearestExpiryNiftyOptions(10);
    const quotes = await getOptionQuotesByTradingSymbols(
      optionSlice.options.map((o) => o.tradingsymbol)
    );

    // Build strike -> { ceOi, peOi } map
    const strikeData = new Map();
    for (const opt of optionSlice.options) {
      const quote = quotes[opt.tradingsymbol];
      if (!quote || quote.oi == null) {
        continue;
      }
      const existing = strikeData.get(opt.strike) ?? { ceOi: 0, peOi: 0 };
      if (opt.optionType === 'CE') {
        existing.ceOi = quote.oi;
      } else {
        existing.peOi = quote.oi;
      }
      strikeData.set(opt.strike, existing);
    }

    const strikes = [...strikeData.keys()].sort((a, b) => a - b);
    if (strikes.length === 0) {
      return { maxPainStrike: 0, spotPrice: optionSlice.spotPrice, distanceFromSpot: 0, distancePct: 0, direction: 'at-spot', confidenceContribution: 0, isExpiryDay: false, error: `No strike data available` };
    }

    // For each candidate settlement strike S, compute total payout to option buyers
    let minPayout = Infinity;
    let maxPainStrike = strikes[0];

    for (const S of strikes) {
      let totalPayout = 0;
      for (const [K, data] of strikeData) {
        // CE buyers get paid when S > K
        if (S > K) {
          totalPayout += (S - K) * data.ceOi;
        }
        // PE buyers get paid when S < K
        if (S < K) {
          totalPayout += (K - S) * data.peOi;
        }
      }
      if (totalPayout < minPayout) {
        minPayout = totalPayout;
        maxPainStrike = S;
      }
    }

    const spotPrice = optionSlice.spotPrice;
    const distanceFromSpot = maxPainStrike - spotPrice;
    const distancePct = spotPrice > 0 ? (distanceFromSpot / spotPrice) * 100 : 0;

    let direction = 'at-spot';
    if (Math.abs(distanceFromSpot) > NIFTY_STRIKE_STEP * 0.5) {
      direction = distanceFromSpot > 0 ? 'above-spot' : 'below-spot';
    }

    // Check if today is expiry day (Thursday IST)
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffset);
    const isExpiryDay = istNow.getUTCDay() === 4;

    // Confidence: if signal moves price toward max pain, add confidence
    let contribution = 0;
    if (signalDir) {
      const movingTowardMaxPain =
        (signalDir === 'BUY' && direction === 'above-spot') ||
        (signalDir === 'SELL' && direction === 'below-spot');
      if (movingTowardMaxPain) {
        contribution = isExpiryDay ? weight * 2 : weight; // Double weight on expiry day
      } else if (direction === 'at-spot') {
        contribution = Math.round(weight * 0.5);
      }
    }

    return {
      maxPainStrike,
      spotPrice,
      distanceFromSpot: Number(distanceFromSpot.toFixed(2)),
      distancePct: Number(distancePct.toFixed(2)),
      direction,
      confidenceContribution: Math.min(contribution, weight * 2),
      isExpiryDay
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`[zerodhaService] calculateMaxPain failed message=${message}`, err);
    return { maxPainStrike: 0, spotPrice: 0, distanceFromSpot: 0, distancePct: 0, direction: 'at-spot', confidenceContribution: 0, isExpiryDay: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// OI-based Support/Resistance
// ---------------------------------------------------------------------------

async function getOiBasedSupportResistance(signalDir) {
  const weight = getTunables().oiSrWeight;

  try {
    const optionSlice = await getNearestExpiryNiftyOptions(10);
    const quotes = await getOptionQuotesByTradingSymbols(
      optionSlice.options.map((o) => o.tradingsymbol)
    );

    let maxCeOi = 0;
    let maxCeStrike = 0;
    let maxPeOi = 0;
    let maxPeStrike = 0;

    for (const opt of optionSlice.options) {
      const quote = quotes[opt.tradingsymbol];
      if (!quote || quote.oi == null) {
        continue;
      }
      if (opt.optionType === 'CE' && quote.oi > maxCeOi) {
        maxCeOi = quote.oi;
        maxCeStrike = opt.strike;
      }
      if (opt.optionType === 'PE' && quote.oi > maxPeOi) {
        maxPeOi = quote.oi;
        maxPeStrike = opt.strike;
      }
    }

    const spotPrice = optionSlice.spotPrice;
    const nearThreshold = spotPrice * 0.005; // 0.5% of spot

    let priceRelation = 'between-levels';
    if (maxCeStrike > 0 && Math.abs(spotPrice - maxCeStrike) <= nearThreshold) {
      priceRelation = 'near-resistance';
    } else if (maxPeStrike > 0 && Math.abs(spotPrice - maxPeStrike) <= nearThreshold) {
      priceRelation = 'near-support';
    }

    let contribution = weight;
    if (signalDir) {
      // If BUY near OI resistance, reduce confidence
      if (signalDir === 'BUY' && priceRelation === 'near-resistance') {
        contribution = 0;
      }
      // If SELL near OI support, reduce confidence
      else if (signalDir === 'SELL' && priceRelation === 'near-support') {
        contribution = 0;
      }
      // If signal aligned with room to move, full confidence
      else if (
        (signalDir === 'BUY' && spotPrice > maxPeStrike && spotPrice < maxCeStrike) ||
        (signalDir === 'SELL' && spotPrice > maxPeStrike && spotPrice < maxCeStrike)
      ) {
        contribution = weight;
      }
    }

    return {
      support: { strike: maxPeStrike, peOi: maxPeOi },
      resistance: { strike: maxCeStrike, ceOi: maxCeOi },
      spotPrice,
      priceRelation,
      confidenceContribution: contribution
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`[zerodhaService] getOiBasedSupportResistance failed message=${message}`, err);
    return {
      support: { strike: 0, peOi: 0 },
      resistance: { strike: 0, ceOi: 0 },
      spotPrice: 0,
      priceRelation: 'between-levels',
      confidenceContribution: 0,
      error: message
    };
  }
}

module.exports = {
  calculateMaxPain,
  getOiBasedSupportResistance
};
