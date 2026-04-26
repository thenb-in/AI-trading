// In-process cron job registry.
//
// Wraps node-cron with a consistent overlap guard, timing log, and error
// isolation so every in-process scheduler can be registered the same way
// without each of them reinventing the wheel.
//
// Usage (app-specific jobs register themselves, then call startAllJobs from
// server/index.js after models are ready):
//
//   const { registerJob, startAllJobs } = require('../../scheduler/lib/jobRegistry');
//
//   registerJob({
//     name: 'daily-cleanup',
//     cronTime: '0 0 * * *',
//     run: () => cleanupOldRecords(),
//     enabled: true
//   });
//
//   // In server/index.js after DB is ready:
//   startAllJobs();
//   // On graceful shutdown:
//   stopAllJobs();

const cron = require('node-cron');
const logger = require('../../logger');

// Every registered job, keyed by name. Registering the same name twice throws.
const jobs = new Map();
// Runtime state keyed by name — separate from the definition so tests can
// inspect it and stopAllJobs can clean up cleanly.
const jobState = new Map();

/**
 * Register a new in-process cron job. Must be called BEFORE startAllJobs().
 *
 * @param {Object}   opts
 * @param {string}   opts.name      Unique job name; used in logs and metrics.
 * @param {string}   opts.cronTime  Standard cron expression (node-cron syntax).
 * @param {Function} opts.run       Async function that executes one tick.
 *                                  May return anything; return value is logged.
 * @param {boolean}  [opts.enabled=true]  Skip registration when false (useful
 *                                  for env-gated jobs).
 * @param {string}   [opts.skipReason]    Human-readable reason for why an
 *                                  `enabled:false` job was skipped; logged
 *                                  once at registration time.
 */
function registerJob({ name, cronTime, run, enabled = true, skipReason }) {
  if (!name || typeof name !== 'string') {
    throw new Error(`jobRegistry: job name is required (got ${name})`);
  }
  if (jobs.has(name)) {
    throw new Error(`jobRegistry: job "${name}" is already registered`);
  }
  if (!enabled) {
    logger.info(`scheduler: [${name}] not registered (disabled)${skipReason ? `: ${skipReason}` : ''}`);
    return;
  }
  if (!cronTime || typeof cronTime !== 'string') {
    throw new Error(`jobRegistry: cronTime is required for job "${name}"`);
  }
  if (typeof run !== 'function') {
    throw new Error(`jobRegistry: run() is required for job "${name}"`);
  }
  if (!cron.validate(cronTime)) {
    throw new Error(`jobRegistry: invalid cron expression for job "${name}": ${cronTime}`);
  }

  jobs.set(name, { name, cronTime, run });
  logger.info(`scheduler: [${name}] registered with schedule "${cronTime}"`);
}

/**
 * Start every registered job. Safe to call multiple times — already-started
 * jobs are a no-op.
 */
function startAllJobs() {
  for (const job of jobs.values()) {
    if (jobState.has(job.name)) {
      logger.debug(`scheduler: [${job.name}] start() called but job is already started`);
      continue;
    }

    const task = cron.schedule(job.cronTime, () => tick(job), { scheduled: true });
    jobState.set(job.name, { task, running: false, lastRunAt: null });
    logger.info(`scheduler: [${job.name}] started (${job.cronTime})`);
  }
}

/**
 * Stop every started job. Safe to call on shutdown even if startAllJobs() was
 * never called.
 */
function stopAllJobs() {
  for (const [name, state] of jobState.entries()) {
    try {
      state.task.stop();
      logger.info(`scheduler: [${name}] stopped`);
    } catch (error) {
      logger.error(`scheduler: [${name}] error stopping task: ${error.message}`, error);
    }
  }
  jobState.clear();
}

/**
 * Internal: execute one tick for a job with overlap guard + timing log +
 * error isolation.
 */
async function tick(job) {
  const state = jobState.get(job.name);
  if (!state) {
    return;
  }
  if (state.running) {
    logger.warn(`scheduler: [${job.name}] previous tick still running; skipping this one`);
    return;
  }
  state.running = true;
  const startedAt = Date.now();
  try {
    logger.info(`scheduler: [${job.name}] tick start`);
    const result = await job.run();
    const duration = Date.now() - startedAt;
    state.lastRunAt = new Date();
    logger.info(`scheduler: [${job.name}] tick done in ${duration}ms${result !== undefined ? ` result=${safeStringify(result)}` : ''}`);
  } catch (error) {
    const duration = Date.now() - startedAt;
    logger.error(`scheduler: [${job.name}] tick failed after ${duration}ms: ${error.message}`, error);
  } finally {
    state.running = false;
  }
}

function safeStringify(value) {
  try {
    if (value === null || typeof value !== 'object') {
      return String(value);
    }
    return JSON.stringify(value);
  } catch (err) {
    logger.debug(`scheduler: safeStringify failed: ${err.message}`);
    return '[unstringifiable]';
  }
}

/** Test hook: clear the registry. Not used in prod. */
function _resetForTests() {
  stopAllJobs();
  jobs.clear();
}

module.exports = { registerJob, startAllJobs, stopAllJobs, _resetForTests };
