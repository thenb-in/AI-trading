// Factory for standalone scheduler processes (systemd services).
//
// Both sync_transaction and sync_terminal_commands used to ship their own
// ~200-line runner file that: authenticated the DB, ran the first sync
// immediately, scheduled a cron via `cron.CronJob`, guarded against overlap,
// handled SIGINT/SIGTERM, and closed the DB on shutdown. All of that was
// near-identical modulo log prefixes and env vars.
//
// This factory keeps a single implementation of that lifecycle and lets each
// scheduler opt in by providing just a name and a `syncOnce` function.
//
//   const { createStandaloneScheduler } = require('./standaloneSchedulerFactory');
//   const { syncOnce } = require('./mySync');
//
//   createStandaloneScheduler({ name, cronTime, syncOnce, batchSize }) — used by
//     runner_sync_scheduler.js; schedules `syncOnce` on cron with overlap guard.
//
//   runOnceStandalone({ name, syncOnce }) — used by runner_sync_once.js when
//     executed directly (`node runner_sync_once.js` or the `*-sync` npm script)
//     to run a single sync cycle and exit.

const { CronJob } = require('cron');
const logger = require('../../logger');
const db = require('../../src/models');

/**
 * Create and start a standalone cron scheduler as its own process. Intended
 * to be called at the bottom of a `runner_sync_scheduler.js` file; that file
 * is then launched via `node scheduler/<name>/runner_sync_scheduler.js`.
 *
 * @param {Object}   opts
 * @param {string}   opts.name      Used as log prefix (e.g. 'sync_transaction')
 * @param {string}   opts.cronTime  Standard cron expression
 * @param {Function} opts.syncOnce  async (batchSize?) => number|any
 *                                  The one-cycle sync function.
 * @param {number}   [opts.batchSize]  Passed through to syncOnce on each tick.
 */
function createStandaloneScheduler({ name, cronTime, syncOnce, batchSize }) {
  if (!name || !cronTime || typeof syncOnce !== 'function') {
    throw new Error(`standaloneSchedulerFactory: name, cronTime, syncOnce are required (name=${name}, cronTime=${cronTime})`);
  }

  let running = false;
  let cronJob = null;

  const runTick = async (tag) => {
    if (running) {
      logger.warn(`${name}: [${tag}] previous run still in progress; skipping this tick`);
      return;
    }
    running = true;
    const startedAt = Date.now();
    try {
      logger.info(`${name}: [${tag}] start (batchSize=${batchSize ?? 'default'})`);
      const result = await syncOnce(batchSize);
      const duration = Date.now() - startedAt;
      logger.info(`${name}: [${tag}] done in ${duration}ms result=${String(result)}`);
    } catch (error) {
      const duration = Date.now() - startedAt;
      logger.error(`${name}: [${tag}] failed after ${duration}ms: ${error.message}`, error);
    } finally {
      running = false;
    }
  };

  const start = async () => {
    logger.info(`${name}: [START] scheduler starting (cronTime=${cronTime}, batchSize=${batchSize ?? 'default'})`);

    // Run the first tick immediately so startup is productive without waiting
    // for the next cron boundary.
    await runTick('INITIAL');

    cronJob = new CronJob(cronTime, () => {
      runTick('CRON').catch((err) => logger.error(`${name}: [CRON] tick crashed: ${err.message}`, err));
    });
    cronJob.start();
    logger.info(`${name}: [START] scheduled`);
  };

  const stop = async () => {
    logger.info(`${name}: [STOP] stopping scheduler`);
    if (cronJob) {
      try {
        cronJob.stop();
      } catch (error) {
        logger.error(`${name}: [STOP] error stopping cron job: ${error.message}`, error);
      }
      cronJob = null;
    }
  };

  const bootstrap = async () => {
    try {
      await db.sequelize.authenticate();
      logger.info(`${name}: [MAIN] database authenticated`);
      await start();
    } catch (error) {
      logger.error(`${name}: [MAIN] failed to start: ${error.message}`, error);
      process.exit(1); // eslint-disable-line no-process-exit
    }
  };

  const gracefulShutdown = async (signal) => {
    logger.info(`${name}: [SHUTDOWN] received ${signal}`);
    try {
      await stop();
      await db.sequelize.close();
      logger.info(`${name}: [SHUTDOWN] clean exit`);
      process.exit(0); // eslint-disable-line no-process-exit
    } catch (error) {
      logger.error(`${name}: [SHUTDOWN] error: ${error.message}`, error);
      process.exit(1); // eslint-disable-line no-process-exit
    }
  };

  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

  bootstrap();
}

/**
 * Run a single sync cycle and exit. Used by the `*-sync` npm scripts and by
 * `runner_sync_once.js` files executed directly via `node`.
 *
 * @param {Object}   opts
 * @param {string}   opts.name
 * @param {Function} opts.syncOnce
 * @param {number}   [opts.batchSize]
 */
async function runOnceStandalone({ name, syncOnce, batchSize }) {
  const startedAt = Date.now();
  logger.info(`${name}: [STANDALONE] running sync once`);

  try {
    await db.sequelize.authenticate();
    logger.info(`${name}: [STANDALONE] database authenticated`);

    const result = await syncOnce(batchSize);
    const duration = Date.now() - startedAt;
    logger.info(`${name}: [STANDALONE] sync done in ${duration}ms result=${String(result)}`);

    await db.sequelize.close();
    logger.info(`${name}: [STANDALONE] database closed`);
    process.exit(0); // eslint-disable-line no-process-exit
  } catch (error) {
    const duration = Date.now() - startedAt;
    logger.error(`${name}: [STANDALONE] failed after ${duration}ms: ${error.message}`, error);
    try {
      await db.sequelize.close();
    } catch (closeErr) {
      logger.error(`${name}: [STANDALONE] error closing db during failure handling: ${closeErr.message}`, closeErr);
    }
    process.exit(1); // eslint-disable-line no-process-exit
  }
}

module.exports = {
  createStandaloneScheduler,
  runOnceStandalone
};
