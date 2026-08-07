// Tells the user their saved report run finished, over both channels:
//
//   REPORT_RUN_DONE  — the report page they may still be sitting on, which
//                      fetches the payload and fills the grid in.
//   notification     — the bell, for when they have moved on. This is the whole
//                      point of saving runs: the work is not wasted and they do
//                      not have to babysit a spinner.
//
// Both go to the requesting user's room only. A run is one person's query with
// their filters; nobody else needs to be told about it.

const logger = require('../../../../logger');
const notificationService = require('../../../services/notificationService');
const reportRunService = require('../../../services/reportRunService');
const { emitToUsers } = require('../../../notifications/notificationEmitter');
const { formatNotification } = require('../../../notifications/notificationFormatter');
const { NOTIFICATION_NEW, NOTIFICATION_TYPES } = require('../../../constants/notifications');
const { REPORT_RUN_DONE } = require('../../../constants/socketEvent');
const {
  REPORT_RUN_STATUS,
  REPORT_RUN_LOG_PREFIX,
  reportPath,
  savedRunPath
} = require('../../../constants/reportRuns');

// The report's own name is the title. "Report ready" on its own is useless to
// someone who kicked off three of them.
function buildMessage(run, status, error) {
  const label = run.reportTitle || run.reportKey;
  if (status !== REPORT_RUN_STATUS.DONE) {
    return {
      type: NOTIFICATION_TYPES.REPORT_FAILED,
      title: `${label} failed`,
      message: `It could not be generated: ${error || 'unknown error'}`
    };
  }
  const rows = Number(run.rowCount ?? 0).toLocaleString('en-IN');
  return {
    type: NOTIFICATION_TYPES.REPORT_READY,
    title: `${label} is ready`,
    message: `${rows} rows, with the filters you ran it on. Click to open it.`
  };
}

async function notifyReportRunFinished({ run, status, error }) {
  try {
    // Re-read: the runner owns the row while it works, so rowCount and the final
    // status live in the database, not in the copy this process created.
    const fresh = await reportRunService.getById(run.id, run.companyId) || run;

    emitToUsers([run.userId], REPORT_RUN_DONE, {
      runId: run.id,
      status,
      reportKey: fresh.reportKey,
      rowCount: fresh.rowCount ?? null,
      error: error || fresh.errorMessage || null
    });

    const { type, title, message } = buildMessage(fresh, status, error);
    const row = await notificationService.create({
      userId: run.userId,
      companyId: run.companyId,
      type,
      title,
      message,
      // meta.link makes the bell entry clickable, and it points at the report
      // itself on this exact run — one click from "it's ready" to reading it.
      // A failed run has no result to open, so it points at the report instead,
      // which is where you would go to try again.
      //
      // The link doubles as the client's "am I already looking at this?" test:
      // a toast is pointless when the page it announces is the one on screen.
      meta: {
        runId: run.id,
        reportKey: fresh.reportKey,
        link: status === REPORT_RUN_STATUS.DONE
          ? savedRunPath(fresh.reportKey, run.id)
          : reportPath(fresh.reportKey)
      }
    });
    if (row) {
      emitToUsers([run.userId], NOTIFICATION_NEW, formatNotification(row));
    }
  } catch (err) {
    // A run that finished but failed to announce itself is still a saved run —
    // the user will find it in the Reporting Manager. Never let this throw into
    // the dispatch path.
    logger.error(`${REPORT_RUN_LOG_PREFIX} failed to announce run ${run?.id}: ${err.message}`, err);
  }
}

module.exports = { notifyReportRunFinished };
