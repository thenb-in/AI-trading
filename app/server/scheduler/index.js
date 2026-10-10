// In-process scheduled jobs for the AI-trading app. Lifecycle (start/stop,
// logging, register-and-start) is handled by the framework — see
// startup/server/scheduler/index.js. This file declares which jobs run.
//
// Migrated from the legacy app's server/scheduler/index.js. Every cronTime is
// preserved verbatim from source. The one addition is `trading.method2EngineTick`,
// which replaces the legacy index.js HTTP self-poll hack (the old server fetched
// its own /api/v1/market/method2 every 10s so the full trade lifecycle ticked
// with no browser open) — same effect, no self-HTTP.

const { registerJob } = require('@startup/scheduler');
const logger = require('@startup/logger');

function registerAllJobs() {
  const { collectNiftyOptionSnapshots, isZerodhaTokenError } = require('../src/services/optionSnapshotService');
  const { getZerodhaErrorMessage, saveNfoInstrumentsSnapshot } = require('@appServer/interfaces/broker');
  const { sendDailySummaryMail } = require('../src/services/dailySummaryMailService');
  const { tick: scalpPaperTick } = require('../src/services/scalpPaperService');
  const { tick: chainFeedTick } = require('../src/services/chainFeedService');
  const { evaluateActive: m2TradeEvaluate } = require('../src/services/method2TradeService');
  const { runNightlyArchive } = require('../src/services/historyArchiveService');
  const engine = require('../src/services/method2EngineService');
  const { isMarketOpen } = require('../src/utils/optionMath');

  // Live per-minute option-snapshot collector (every 2 minutes).
  registerJob({
    name: 'trading.optionSnapshots',
    cronTime: '*/2 * * * *',
    run: async () => {
      try {
        await collectNiftyOptionSnapshots();
      } catch (err) {
        if (isZerodhaTokenError(err)) {
          logger.warn(`[optionSnapshot] Zerodha token invalid — skipping snapshot`);
          return;
        }
        logger.error(`[optionSnapshot] Scheduled run failed: ${getZerodhaErrorMessage(err)}`, err);
      }
    }
  });

  // Full NFO instruments list every evening at 18:00 IST (12:30 UTC), Mon–Fri.
  registerJob({
    name: 'trading.nfoInstrumentsSnapshot',
    cronTime: '30 12 * * 1-5',
    run: async () => {
      try {
        const result = await saveNfoInstrumentsSnapshot();
        logger.info(`[nfoInstruments] Nightly save done: ${result.inserted} new rows for ${result.date}`);
      } catch (err) {
        if (isZerodhaTokenError(err)) {
          logger.warn(`[nfoInstruments] Zerodha token invalid — skipping snapshot`);
          return;
        }
        logger.error(`[nfoInstruments] Nightly save failed: ${getZerodhaErrorMessage(err)}`, err);
      }
    }
  });

  // Live option-chain feed — fresh per-minute OI/premium/volume for Method 2.
  registerJob({
    name: 'trading.chainFeed',
    cronTime: '* * * * *',
    run: async () => {
      try {
        await chainFeedTick('NIFTY');
      } catch (err) {
        if (isZerodhaTokenError(err)) {
          logger.warn(`[chainFeed] Zerodha token invalid — skipping tick`);
          return;
        }
        logger.error(`[chainFeed] tick failed: ${getZerodhaErrorMessage(err)}`, err);
      }
    }
  });

  // Method 2 active-trade resolver (open/trail/stop/target lifecycle).
  registerJob({
    name: 'trading.method2Trades',
    cronTime: '* * * * *',
    run: async () => {
      try {
        await m2TradeEvaluate({});
      } catch (err) {
        if (isZerodhaTokenError(err)) {
          return;
        }
        logger.error(`[m2trade] resolver failed: ${getZerodhaErrorMessage(err)}`, err);
      }
    }
  });

  // Engine self-tick every 10s during market hours — replaces the legacy HTTP
  // self-poll so the full lifecycle (open/trail/catch-up/stop-repair) ticks with
  // no browser open. Guards: weekdays only, market open, and no re-entrancy.
  let ticking = false;
  registerJob({
    name: 'trading.method2EngineTick',
    cronTime: '*/10 * * * * *',
    run: async () => {
      const nowSec = Math.floor(Date.now() / 1000);
      const istDay = new Date(Date.now() + 19800 * 1000).getUTCDay();
      if (istDay === 0 || istDay === 6 || !isMarketOpen(nowSec) || ticking) {
        return;
      }
      ticking = true;
      try {
        await engine.getMethod2();
      } catch {
        // next tick retries
      } finally {
        ticking = false;
      }
    }
  });

  // Scalp forward paper-trading recorder — every minute (no-ops off-session).
  registerJob({
    name: 'trading.scalpPaper',
    cronTime: '* * * * *',
    run: async () => {
      try {
        await scalpPaperTick('NIFTY');
      } catch (err) {
        if (isZerodhaTokenError(err)) {
          logger.warn(`[scalpPaper] Zerodha token invalid — skipping tick`);
          return;
        }
        logger.error(`[scalpPaper] Tick failed: ${getZerodhaErrorMessage(err)}`, err);
      }
    }
  });

  // Nightly candle archive at 18:20 IST (12:50 UTC), after the instruments snapshot.
  registerJob({
    name: 'trading.historyArchive',
    cronTime: '50 12 * * 1-5',
    run: async () => {
      try {
        const result = await runNightlyArchive();
        logger.info(`[historyArchive] nightly run done: ${JSON.stringify({
          nifty: result.nifty.fetched,
          banknifty: result.banknifty.fetched,
          optionContracts: result.niftyOptions.saved
        })}`);
      } catch (err) {
        if (isZerodhaTokenError(err)) {
          logger.warn(`[historyArchive] Zerodha token invalid — skipping`);
          return;
        }
        logger.error(`[historyArchive] nightly run failed: ${getZerodhaErrorMessage(err)}`, err);
      }
    }
  });

  // Daily signal summary email at 15:30 IST (10:00 UTC), Mon–Fri, after close.
  // The signal ledger lives in the engine service (moved out of the monolith).
  registerJob({
    name: 'trading.dailySummaryMail',
    cronTime: '0 10 * * 1-5',
    run: async () => {
      try {
        const signals = typeof engine.getRecHistory === 'function' ? engine.getRecHistory() : [];
        await sendDailySummaryMail(signals);
      } catch (err) {
        logger.error(`[dailySummaryMail] Failed: ${err.message}`, err);
      }
    }
  });
}

module.exports = { registerAllJobs };
