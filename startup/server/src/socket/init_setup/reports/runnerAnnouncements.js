// Turn the runner's "this run finished" announcements into user notifications.
//
// Every saved run ends the same way regardless of how it got picked up: the
// runner announces, this listens, the user is told. That matters for runs the
// runner resumed from the queue after a restart — nobody is awaiting an RPC for
// those, so without this they would finish silently.

const logger = require('../../../../logger');
const reportRunService = require('../../../services/reportRunService');
const { REPORT_RUN_FINISHED } = require('../../../constants/socketEvent');
const { REPORT_RUN_LOG_PREFIX } = require('../../../constants/reportRuns');
const { notifyReportRunFinished } = require('./reportRunNotifier');

async function onRunFinished({ runId, status, error }) {
  try {
    // The row is the source of truth for who to tell; the announcement only
    // says which run and how it ended.
    const run = await reportRunService.getByIdUnscoped(runId);
    if (!run) {
      logger.warn(`${REPORT_RUN_LOG_PREFIX} announcement for unknown run ${runId}`);
      return;
    }
    await notifyReportRunFinished({ run, status, error });
  } catch (err) {
    logger.error(`${REPORT_RUN_LOG_PREFIX} failed to handle finish announcement for run ${runId}: ${err.message}`, err);
  }
}

/**
 * Attach to the outbound runner link. Only the socket link needs wiring here:
 * the in-process runner announces straight into onRunFinished itself (see
 * inProcessRunner), so there is nothing to attach and nothing lost.
 */
function registerRunnerAnnouncements(client) {
  if (client?.inProcess) {
    return;
  }
  if (!client?.socket) {
    logger.warn(`${REPORT_RUN_LOG_PREFIX} runner link has no socket; finished-run announcements will be ignored`);
    return;
  }
  client.socket.on(REPORT_RUN_FINISHED, onRunFinished);
  logger.info(`${REPORT_RUN_LOG_PREFIX} listening for finished-run announcements from the runner`);
}

module.exports = { registerRunnerAnnouncements, onRunFinished };
