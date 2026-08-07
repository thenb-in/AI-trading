// Server-side handler for the 'report:run' RPC on the client→app-server channel.
//
// Two shapes on one event:
//
//   default    — the runner computes the report and the ack carries it back.
//                Used by callers that want many small payloads immediately (HR
//                dashboard tiles, punch reminder) and have nothing worth saving.
//
//   save: true — the run is recorded, the ack carries only its id, and the work
//                continues in the background. A wide attendance report takes
//                minutes; holding a socket ack open for that means the browser
//                cannot be closed and the result dies with the page. Instead the
//                runner writes the payload to disk, and the user is told over
//                the socket if they are still on the page and through the
//                notification bell either way.
//
// Either way the runner is required: if it is down, surface that. Local
// execution stays available via the regular HTTP Apply button.

const logger = require('@startup/logger');
const { getAppServerRunnerClient } = require('../../appserver_runner');
const { registerSocketHandler } = require('../../client_appserver');
const { REPORT_RUN } = require('../../../constants/socketEvent');
const { REPORT_RUN_STATUS, REPORT_RUN_LOG_PREFIX, REPORT_RUNNER_UNAVAILABLE } = require('../../../constants/reportRuns');
const reportRunService = require('../../../services/reportRunService');

function requireRunner(reportKey) {
  const runner = getAppServerRunnerClient();
  if (!runner.isConnected()) {
    throw new Error(`${REPORT_RUNNER_UNAVAILABLE}: runner is not connected -> ${reportKey}`);
  }
  return runner;
}

/**
 * Hand a recorded run to the runner. Deliberately not awaited by the caller —
 * the ack has already gone back, and this is what happens after.
 *
 * The outcome is not decided here. The runner owns the row's terminal state and
 * announces it (see runnerAnnouncements), which is also how runs it resumed on
 * its own get reported. Marking the run failed here when the link drops would be
 * wrong twice over: the runner may still be computing it, and a failed row is no
 * longer eligible for the restart sweep that would have finished it.
 */
async function dispatchSavedRun({ runner, run, reportKey, filters, user }) {
  try {
    const outcome = await runner.request(REPORT_RUN, { reportKey, filters, user, runId: run.id });
    const ending = outcome?.cancelled ? 'stopped' : 'completed';
    logger.info(`${REPORT_RUN_LOG_PREFIX} run ${run.id} dispatched and ${ending} key=${reportKey} company=${user.company_id}`);
  } catch (err) {
    logger.error(`${REPORT_RUN_LOG_PREFIX} run ${run.id} dispatch lost key=${reportKey}: ${err.message} — leaving it to the runner to finish or resume`, err);
  }
}

async function handleReportRun(payload, socket) {
  const { reportKey, filters, save, reportTitle } = payload || {};
  if (!reportKey) {
    throw new Error(`[report:run] reportKey is required in payload: ${Object.keys(payload || {})}`);
  }
  if (!socket.user) {
    throw new Error(`[report:run] unauthenticated socket id=${socket.id}`);
  }

  const user = socket.user;

  // The unsaved path has nowhere to fall back to: no row is kept, so if the
  // runner is down there is nothing to hand back and no way to make good later.
  if (!save) {
    const runner = requireRunner(reportKey);
    const data = await runner.request(REPORT_RUN, { reportKey, filters, user });
    logger.info(`[report:run] served via report_runner key=${reportKey} company=${user.company_id}`);
    return { source: 'report_runner', data };
  }

  // A saved run is recorded first and unconditionally. The row carries
  // everything needed to compute it, so it is the request — dispatching to the
  // runner is only how that request gets picked up promptly. With the runner
  // down the row waits, and the runner claims it when it next starts.
  const run = await reportRunService.create({
    companyId: user.company_id,
    userId: user.id,
    reportKey,
    reportTitle,
    filters
  });
  logger.info(`${REPORT_RUN_LOG_PREFIX} run ${run.id} queued key=${reportKey} company=${user.company_id}`);

  const runner = getAppServerRunnerClient();
  const dispatched = runner.isConnected();
  if (dispatched) {
    // Intentionally not awaited: the browser gets its runId now, not in ten minutes.
    dispatchSavedRun({ runner, run, reportKey, filters, user });
  } else {
    logger.warn(`${REPORT_RUN_LOG_PREFIX} run ${run.id} left queued: runner not connected`);
  }

  return { runId: run.id, status: REPORT_RUN_STATUS.QUEUED, dispatched };
}

registerSocketHandler(REPORT_RUN, handleReportRun);
