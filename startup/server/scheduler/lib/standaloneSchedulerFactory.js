// Factory for standalone scheduler processes (run as separate Node.js processes,
// e.g. via systemd or pm2).
//
// Provides a reusable lifecycle pattern:
//   - authenticates the database
//   - runs one sync cycle immediately on startup
//   - schedules subsequent ticks via cron
//   - handles overlap guard (no double-run)
//   - handles SIGINT/SIGTERM for graceful shutdown
//
// Usage: create a runner_*.js file for each standalone scheduler:
//
//   const { createStandaloneScheduler } = require('./standaloneSchedulerFactory');
//   const { syncOnce } = require('./mySync');
//
//   createStandaloneScheduler({
//     name: 'my-sync',
//     cronTime: '*/5 * * * *',
//     syncOnce,
//   });
//
// App-specific runner files should live OUTSIDE the startup/ folder,
// e.g. server/scheduler/myFeature/runner.js.

const cron = require('node-cron');
const logger = require('../../logger');
const db = require('../../src/models');

/**
 * Create and start a standalone cron scheduler as its own process.
 *
 * @param {Object}   opts
 * @param {string}   opts.name      Used as log prefix
 * @param {string}   opts.cronTime  Standard cron expression
 * @param {Function} opts.syncOnce  async (batchSize?) => any
 * @param {number}   [opts.batchSize]  Passed through to syncOnce on each tick.
 */
function createStandaloneScheduler({ name, cronTime, syncOnce, batchSize }) {
  if (!name || !cronTime || typeof syncOnce !== 'function') {
    throw new Error(`standaloneSchedulerFactory: name, cronTime, syncOnce are required (name=${name})`);
  }

  let running = false;
  let cronTask = null;

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
    // for the first cron boundary.
    await runTick('INITIAL');

    cronTask = cron.schedule(cronTime, () => {
      runTick('CRON').catch((err) =>
        logger.error(`${name}: [CRON] tick crashed: ${err.message}`, err)
      );
    }, { scheduled: true });

    logger.info(`${name}: [START] scheduled`);
  };

  const stop = async () => {
    logger.info(`${name}: [STOP] stopping scheduler`);
    if (cronTask) {
      try {
        cronTask.stop();
      } catch (error) {
        logger.error(`${name}: [STOP] error stopping cron task: ${error.message}`, error);
      }
      cronTask = null;
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
 * Run a single sync cycle and exit. Used by run-once scripts.
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
      logger.error(`${name}: [STANDALONE] error closing db: ${closeErr.message}`, closeErr);
    }
    process.exit(1); // eslint-disable-line no-process-exit
  }
}

module.exports = { createStandaloneScheduler, runOnceStandalone };
