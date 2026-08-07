// Nightly cleanup of saved report runs.
//
// Saved runs are a cache, not a record: the attendance and salary data behind
// them keeps moving, so a fortnight-old run answers a question nobody is asking
// any more. Left alone they accumulate the largest files this application
// writes, so the horizon is enforced rather than advisory.
//
// Run rows go first, then their payloads are handed to Drive for deletion. In
// that order a crash between the two leaves an orphan Drive entry (visible, and
// cleanable) rather than a run row pointing at a file that is already gone.

const logger = require('../../logger');
const reportRunService = require('../../src/services/reportRunService');
const { removePayloads } = require('../../src/utils/reportPayloadStore');
const { REPORT_RUN_RETENTION_DAYS, REPORT_RUN_LOG_PREFIX } = require('../../src/constants/reportRuns');

async function purgeExpiredReportRuns(retentionDays = REPORT_RUN_RETENTION_DAYS) {
  const { deletedCount, payloadFiles } = await reportRunService.purgeOlderThan(retentionDays);
  if (deletedCount === 0) {
    logger.info(`${REPORT_RUN_LOG_PREFIX} purge: nothing older than ${retentionDays} days`);
    return { deletedCount: 0, filesRemoved: 0 };
  }
  const filesRemoved = await removePayloads(payloadFiles);
  logger.info(`${REPORT_RUN_LOG_PREFIX} purge: removed ${deletedCount} run(s) and ${filesRemoved} payload file(s) older than ${retentionDays} days`);
  return { deletedCount, filesRemoved };
}

module.exports = { purgeExpiredReportRuns };
