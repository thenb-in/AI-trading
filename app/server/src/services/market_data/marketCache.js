'use strict';
const logger = require('@startup/logger');
const { getNiftyPrice, getNiftyCandles, getNiftyPcr, getNiftyTradeSignal } = require('./nseService');

const MARKET_CACHE_TTL_MS = 10_000;

let marketCache = {
  niftyPrice: null,
  indicators: null,
  pcr: null,
  signal: null,
  lastUpdated: 0,
};

let marketCachePromise = null;

async function getMarketSnapshot() {
  const now = Date.now();
  if (now - marketCache.lastUpdated < MARKET_CACHE_TTL_MS) {
    logger.info(`[marketCache] returning cached market data`);
    return marketCache;
  }

  if (marketCachePromise) {
    logger.info(`[marketCache] awaiting ongoing refresh`);
    return marketCachePromise;
  }

  marketCachePromise = (async () => {
    try {
      logger.info(`[marketCache] refreshing market data`);
      const [niftyPrice, niftyCandles, pcr, signal] = await Promise.all([
        getNiftyPrice(),
        getNiftyCandles(),
        getNiftyPcr().catch((e) => {
          logger.error(`[marketCache] PCR fetch failed ${e instanceof Error ? e.message : e}`, e);
          return { totalCE_OI: 0, totalPE_OI: 0, pcr: null, interpretation: 'unavailable', error: 'Zerodha token invalid' };
        }),
        getNiftyTradeSignal(),
      ]);

      marketCache = {
        niftyPrice,
        indicators: {
          latestClosePrice: niftyCandles.latestClosePrice ?? null,
          ema20: niftyCandles.ema20 ?? null,
          ema50: niftyCandles.ema50 ?? null,
          vwap: niftyCandles.vwap ?? null,
          rsi: niftyCandles.rsi ?? null,
          rsiInterpretation: niftyCandles.rsiInterpretation ?? null,
        },
        pcr,
        signal,
        lastUpdated: Date.now(),
      };

      logger.info(`[marketCache] market data updated`);
      return marketCache;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`[marketCache] refresh failed message=${message}`, err);
      throw err;
    } finally {
      marketCachePromise = null;
    }
  })();

  return marketCachePromise;
}

function invalidateMarketCache() {
  marketCache.lastUpdated = 0;
}

module.exports = { getMarketSnapshot, invalidateMarketCache };
