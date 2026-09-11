// Bounded FIFO for report jobs.
//
// This process exists to keep heavy reports off the app server's CPU. Running
// every arriving report immediately just moves the pile-up here: ten wide
// attendance runs at once and each one takes ten times as long, so nobody gets
// anything. Jobs queue instead and a few run at a time.
//
// Deliberately in-memory: a queue that survives restarts is a different feature
// (durable jobs, retries, dead letters) and the run rows already record what was
// asked for, so nothing is silently lost.

const logger = require('@startup/logger');
const env = require('@startup/src/config/env');

const pending = [];
let active = 0;

function concurrencyLimit() {
  return env.REPORT_RUNNER_CONCURRENCY;
}

function pump() {
  while (active < concurrencyLimit() && pending.length > 0) {
    const { task, resolve, reject } = pending.shift();
    active += 1;
    Promise.resolve()
      .then(task)
      .then(resolve, reject)
      .finally(() => {
        active -= 1;
        pump();
      });
  }
}

/**
 * Run `task` when a slot is free. Resolves/rejects with the task's own result,
 * so callers cannot tell whether they waited.
 *
 * `key` names the job so it can be dropped again before it starts — see
 * dropPending. Jobs without one are simply not droppable.
 */
function enqueue(task, label = 'job', key = null) {
  return new Promise((resolve, reject) => {
    pending.push({ task, resolve, reject, key });
    if (pending.length > 0 && active >= concurrencyLimit()) {
      logger.info(`[report-runner] ${label} queued (active=${active} waiting=${pending.length})`);
    }
    pump();
  });
}

/**
 * Take a job out of the queue before it ever runs, resolving its caller with
 * `{ cancelled: true }`.
 *
 * This is the cheapest half of stopping a report and the most common one: with
 * a few slots and a pile of waiting work, a report the user changed their mind
 * about has usually not started yet, and never starting is a complete stop.
 */
function dropPending(key) {
  const index = pending.findIndex((job) => job.key !== null && job.key === key);
  if (index === -1) {
    return false;
  }
  const [job] = pending.splice(index, 1);
  logger.info(`[report-runner] ${key} dropped from the queue before it started`);
  job.resolve({ cancelled: true });
  return true;
}

function stats() {
  return { active, waiting: pending.length, limit: concurrencyLimit() };
}

module.exports = { enqueue, dropPending, stats };
