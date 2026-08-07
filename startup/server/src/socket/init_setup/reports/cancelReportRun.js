// Stopping a saved run, from the app server's side.
//
// The database is where a run is actually stopped: a queued run only ever starts
// by a claim that matches status='queued', so once the row says cancelled it can
// no longer be picked up — not by a live dispatch, not by the runner's restart
// sweep. That much is reportRunService.cancel's job.
//
// What is left is everything outside the database:
//
//   the runner — it may be holding this run right now, either waiting for a slot
//                or part-way through its queries. Telling it is what makes a
//                stop take effect *midway* rather than at the next boundary.
//   the user   — a page sitting on this run is waiting on REPORT_RUN_DONE, and
//                would wait forever if a stopped run never announced itself.
//
// No bell notification: the user pressed stop, so telling them it stopped is
// noise. The Reporting Manager shows the cancelled row for the record.

const logger = require('../../../../logger');
const { getAppServerRunnerClient } = require('../../appserver_runner');
const { emitToUsers } = require('../../../notifications/notificationEmitter');
const { REPORT_RUN_CANCEL, REPORT_RUN_DONE } = require('../../../constants/socketEvent');
const { REPORT_RUN_STATUS, REPORT_RUN_LOG_PREFIX } = require('../../../constants/reportRuns');

/**
 * Ask the runner to drop the work. Best effort by design — with the runner down
 * there is nothing in flight to stop, and the cancelled row already guarantees
 * nothing starts later.
 */
async function stopRunnerWork(runId) {
  const runner = getAppServerRunnerClient();
  if (!runner.isConnected()) {
    logger.info(`${REPORT_RUN_LOG_PREFIX} run ${runId} cancelled with no runner connected — nothing in flight to stop`);
    return;
  }
  try {
    const { dropped, running, cancelledQueries } = await runner.request(REPORT_RUN_CANCEL, { runId }) || {};
    logger.info(`${REPORT_RUN_LOG_PREFIX} run ${runId} stop acknowledged by runner: droppedFromQueue=${dropped} wasRunning=${running} queriesCancelled=${cancelledQueries}`);
  } catch (err) {
    // The row is cancelled either way; the report may run to completion and
    // find its result unwanted, which costs CPU but never a wrong result.
    logger.warn(`${REPORT_RUN_LOG_PREFIX} run ${runId} stop could not reach the runner: ${err.message}`);
  }
}

async function cancelReportRun(run) {
  emitToUsers([run.userId], REPORT_RUN_DONE, {
    runId: run.id,
    status: REPORT_RUN_STATUS.CANCELLED,
    reportKey: run.reportKey,
    rowCount: null,
    error: null
  });
  await stopRunnerWork(run.id);
}

module.exports = { cancelReportRun };
