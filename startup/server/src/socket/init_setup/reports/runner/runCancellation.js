// Making a stop take effect while the report is being computed.
//
// A cancelled row already stops a run that has not started — the claim that
// would have begun it matches status='queued' and no longer finds it. This is
// about the other case: the report is running right now, and almost all of that
// time is spent inside the database. Node cannot abandon a query it is waiting
// on, so stopping one means asking Postgres to cancel it.
//
// Reports are not written with cancellation in mind and should not have to be —
// there are dozens of them, all ordinary controllers reached through the
// registry. So the link between "this query" and "the run that issued it" is
// made underneath them: an AsyncLocalStorage store follows the run through every
// await, and sequelize's beforeQuery/afterQuery hooks record which backend
// process each of its queries is occupying. Stopping a run is then two things:
//
//   1. refuse its next query. A report that swallows an error, or is midway
//      through a loop of queries, would otherwise carry on regardless — and
//      sequelize's retry (3 attempts, no match list, so every error is retried)
//      would re-issue the very query the database just cancelled. The refusal is
//      what makes a cancel stick rather than being retried around.
//   2. cancel the queries already in flight, which is what actually gives the
//      database back its CPU.
//
// What it cannot interrupt: a report between queries, in JavaScript — a long
// grouping or formatting pass runs to the end, and the result is discarded when
// it gets there. Cancellation lands at the next query, which for report work is
// nearly always moments away.
//
// One accepted race: a pid is dropped when its query ends, so a cancel issued in
// the instant between a query finishing and its connection being reused could
// reach a backend that has already moved on to another run's query. That run
// fails and can be re-run; nothing is corrupted. Narrowing it further would mean
// tagging every query at the database, which costs a round trip per query.

const { AsyncLocalStorage } = require('node:async_hooks');

const logger = require('@startup/logger');
const { sequelize, canCancelQueries, cancelBackends } = require('@startup/src/services/databaseService');
const { RUN_STOPPED_ERROR } = require('./constants');
const { dropPending } = require('./jobQueue');

const runStore = new AsyncLocalStorage();
// Only runs currently being computed. A run leaves as soon as its work does, so
// this is also the answer to "is this run in flight here right now?".
const inFlight = new Map();

function keyFor(runId) {
  return String(runId);
}

/**
 * Install the query hooks. Called once at boot, before any report runs.
 *
 * The refusal half works on any dialect; only the cancel half is Postgres's.
 */
function installQueryTracking() {
  sequelize.addHook('beforeQuery', (_options, query) => {
    const context = runStore.getStore();
    if (!context) {
      return;
    }
    if (context.stopped) {
      throw new Error(RUN_STOPPED_ERROR);
    }
    const pid = query?.connection?.processID;
    if (pid) {
      context.pids.add(pid);
    }
  });

  sequelize.addHook('afterQuery', (_options, query) => {
    const context = runStore.getStore();
    const pid = query?.connection?.processID;
    if (context && pid) {
      context.pids.delete(pid);
    }
  });

  if (!canCancelQueries()) {
    logger.warn(`[report-runner] dialect=${sequelize.getDialect()} cannot cancel a query already running: a stopped run ends at its next query instead`);
  }
}

/**
 * Ask the database to stop the queries this run currently occupies.
 *
 * Runs on a pooled connection of its own. With the pool far larger than the
 * runner's concurrency that is free; if it ever did have to wait, the refusal in
 * beforeQuery has already stopped the run from opening anything new.
 */
async function cancelQueries(context) {
  try {
    return await cancelBackends([...context.pids]);
  } catch (err) {
    // The run is stopped regardless: it can no longer open a query, and its row
    // is already cancelled. Only the CPU it is holding is not given back.
    logger.warn(`[report-runner] could not cancel queries for run ${context.runId}: ${err.message}`);
    return 0;
  }
}

/**
 * Compute a run inside a context that can be stopped, and say afterwards whether
 * it was. Everything the task does — every await, every query — happens within
 * the context, so wrap the report and nothing else: the queries that record the
 * outcome must stay outside, or a stop would refuse the very update that records
 * it.
 *
 * `stopped` is returned rather than thrown, because a report that catches its
 * own database errors would otherwise come back looking like a complete result.
 */
async function withCancellation(runId, task) {
  const key = keyFor(runId);
  const context = { runId: key, stopped: false, pids: new Set() };
  inFlight.set(key, context);
  try {
    const result = await runStore.run(context, task);
    return { result, stopped: context.stopped };
  } finally {
    inFlight.delete(key);
  }
}

/**
 * Stop a run: drop it from the queue if it never started, and cut its queries
 * short if it did. Reports what it found, so the app server's log says which of
 * the two happened rather than just "asked".
 */
async function stopRun(runId) {
  const dropped = dropPending(keyFor(runId));
  const context = inFlight.get(keyFor(runId));
  if (!context) {
    return { runId, dropped, running: false, cancelledQueries: 0 };
  }
  context.stopped = true;
  const cancelledQueries = await cancelQueries(context);
  logger.info(`[report-runner] run ${runId} stopped mid-compute, cancelled ${cancelledQueries} quer(ies) in flight`);
  return { runId, dropped, running: true, cancelledQueries };
}

module.exports = { installQueryTracking, withCancellation, stopRun };
