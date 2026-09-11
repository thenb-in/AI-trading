// Pick up work left behind by a restart.
//
// The run row is the request, not just a record of one: it holds the report key,
// the filters, and who asked. So a run that never finished does not need the app
// server to ask again — this process can read the queue and carry on. That makes
// the table the handover point between restarts, and the app server's fallback
// when it cannot reach this process at all: it writes the row regardless, and
// the work happens whenever a runner next comes up.
//
// Runs found mid-compute go back to queued first: nothing is holding them at
// boot, since this is the only process that computes them. Each is then claimed
// through the same queued → running transition a live dispatch uses, so a report
// is never computed twice even if the app server dispatches it at the same moment.

const logger = require('@startup/logger');
const reportRunService = require('@startup/src/services/reportRunService');
const { REPORT_RUN_LOG_PREFIX } = require('@startup/src/constants/reportRuns');
const { handleReportRun } = require('./reportRunHandler');

async function resumePendingRuns() {
  try {
    const requeued = await reportRunService.requeueStaleRunning();
    if (requeued > 0) {
      logger.warn(`${REPORT_RUN_LOG_PREFIX} requeued ${requeued} run(s) interrupted by a restart`);
    }

    const pending = await reportRunService.listPendingRuns();
    if (pending.length === 0) {
      logger.info(`${REPORT_RUN_LOG_PREFIX} no pending runs to resume`);
      return { resumed: 0 };
    }

    logger.info(`${REPORT_RUN_LOG_PREFIX} resuming ${pending.length} pending run(s)`);
    for (const run of pending) {
      // Everything the report needs off the user is the company (and sometimes
      // the id), both of which the row stores — so the request is reconstructable
      // without the original session.
      const user = { id: run.userId, company_id: run.companyId };
      // Not awaited: handleReportRun puts the work on the job queue, which
      // bounds concurrency. Awaiting here would serialise the whole backlog
      // behind the first report and delay boot.
      handleReportRun({ reportKey: run.reportKey, filters: run.filters, user, runId: run.id })
        .catch((err) => logger.error(`${REPORT_RUN_LOG_PREFIX} resumed run ${run.id} failed: ${err.message}`, err));
    }
    return { resumed: pending.length };
  } catch (err) {
    // A runner that cannot read the queue should still serve live requests.
    logger.error(`${REPORT_RUN_LOG_PREFIX} could not resume pending runs: ${err.message}`, err);
    return { resumed: 0 };
  }
}

module.exports = { resumePendingRuns };
