// Handles report:run RPC — validates key, runs registry handler.
// user + company_id come from the RPC payload (real logged-in user), not the service JWT.
//
// With a runId the run is a *saved* one and this process owns the row from here:
// it marks the row running, computes, gzips the result to disk, marks it done,
// and acks a handful of numbers. The payload never travels back over the socket —
// a wide attendance report is tens of megabytes, and the app server's only use
// for it would be to write the very file this process can write itself.

const logger = require('@startup/logger');
const registry = require('@startup/src/socket/init_setup/reports/registry');
const reportRunService = require('@startup/src/services/reportRunService');
const { writePayload, removePayloads } = require('@startup/src/utils/reportPayloadStore');
const { REPORT_RUN_LOG_PREFIX, REPORT_RUN_STATUS } = require('@startup/src/constants/reportRuns');
const { RUN_OUTCOMES } = require('../constants');
const metrics = require('./metrics');
const { enqueue } = require('./jobQueue');
const { announceRunFinished } = require('./announceRunFinished');
const { withCancellation, stopRun } = require('./runCancellation');

// Most reports answer with a single { columns, data }. Multi-section reports —
// employee lifecycle, for one — answer with named sections, each carrying its
// own { columns, data } and nothing at the top level. Counting only result.data
// reported those as 0 rows even though the report was full of them, so the
// sections are summed when there is no top-level array.
function sections(result) {
  if (!result || typeof result !== 'object') {
    return [];
  }
  return Object.values(result).filter((value) => value && Array.isArray(value.data));
}

function countRows(result) {
  if (Array.isArray(result?.data)) {
    return result.data.length;
  }
  const parts = sections(result);
  return parts.length ? parts.reduce((sum, part) => sum + part.data.length, 0) : null;
}

function countColumns(result) {
  if (Array.isArray(result?.columns)) {
    return result.columns.length;
  }
  const parts = sections(result);
  return parts.length
    ? parts.reduce((sum, part) => sum + (Array.isArray(part.columns) ? part.columns.length : 0), 0)
    : null;
}

// Compute the report and keep the result.
//
// Only the report itself runs inside the cancellable context — the writes below
// record what happened and must not be stoppable themselves.
//
// A stop is checked for twice, because it can land on either side of the
// compute: once when the report returns (don't spend minutes gzipping and
// writing a result nobody wants) and once at markDone, which only matches a row
// still marked running. The second is the authoritative one — the database
// decides, so a stop and a completion racing cannot both win.
async function computeAndStore({ runId, reportKey, filters, user }) {
  const { result, stopped } = await withCancellation(runId, () => registry.run(reportKey, { filters, user }));
  if (stopped) {
    logger.info(`${REPORT_RUN_LOG_PREFIX} run ${runId} was stopped while computing — result discarded`);
    return { runId, cancelled: true };
  }

  const rowCount = countRows(result);
  const { driveFileId, bytes } = await writePayload({
    runId,
    companyId: user.company_id,
    userId: user.id,
    payload: result
  });
  const stored = await reportRunService.markDone(runId, {
    driveFileId,
    rowCount,
    columnCount: countColumns(result)
  });
  if (!stored) {
    // The row left 'running' while the payload was being written, i.e. it was
    // stopped. Take the file back out rather than leaving an orphan on disk.
    logger.info(`${REPORT_RUN_LOG_PREFIX} run ${runId} was stopped as it finished — stored payload removed`);
    await removePayloads([{ driveFileId, companyId: user.company_id, userId: user.id }]);
    return { runId, cancelled: true };
  }

  logger.info(`${REPORT_RUN_LOG_PREFIX} run ${runId} stored key=${reportKey} rows=${rowCount} bytes=${bytes} driveFileId=${driveFileId}`);
  announceRunFinished({ runId, status: REPORT_RUN_STATUS.DONE });
  return { runId, rowCount };
}

async function runAndStore({ runId, reportKey, filters, user }) {
  // The claim is the lock. A run dispatched by the app server and the same run
  // swept up at boot both try to take it; only one wins the queued → running
  // transition, so the report is never computed twice. A run stopped while it
  // waited is no longer queued either, so it fails the same claim and is never
  // started.
  const claimed = await reportRunService.claimQueuedRun(runId);
  if (!claimed) {
    logger.info(`${REPORT_RUN_LOG_PREFIX} run ${runId} is no longer queued (claimed elsewhere or stopped), skipping`);
    return { runId, skipped: true };
  }
  try {
    return await computeAndStore({ runId, reportKey, filters, user });
  } catch (err) {
    // markFailed only matches a row still marked running. When it matches
    // nothing the run was stopped, and the error is the stop unwinding the
    // report — not something to tell the user their report failed over.
    const failed = await reportRunService.markFailed(runId, err.message);
    if (!failed) {
      logger.info(`${REPORT_RUN_LOG_PREFIX} run ${runId} ended without a result and is no longer running (stopped): ${err.message}`);
      return { runId, cancelled: true };
    }
    announceRunFinished({ runId, status: REPORT_RUN_STATUS.FAILED, error: err.message });
    throw err;
  }
}

async function handleReportRun(payload) {
  const { reportKey, filters, user, runId } = payload || {};
  if (!reportKey) {
    throw new Error(`[report-runner] reportKey is required in payload (got keys=${Object.keys(payload || {}).join(',') || 'none'})`);
  }
  if (!user?.company_id) {
    throw new Error(`[report-runner] user.company_id is required in payload (user=${user ? Object.keys(user).join(',') : 'null'})`);
  }
  if (!registry.has(reportKey)) {
    throw new Error(`[report-runner] UNKNOWN_REPORT_KEY: ${reportKey} (known=${registry.list().join(',')})`);
  }
  metrics.recordStart(reportKey);
  logger.info(`[report-runner] run key=${reportKey} company=${user.company_id}${runId ? ` runId=${runId}` : ''}`);
  try {
    // Only saved runs queue. The unsaved path serves dashboard tiles that expect
    // an answer now, and holding those behind a long report would be a
    // regression for callers that never asked for background work.
    const result = runId
      ? await enqueue(() => runAndStore({ runId, reportKey, filters, user }), `${reportKey}#${runId}`, String(runId))
      : await registry.run(reportKey, { filters, user });
    metrics.record(reportKey, result?.cancelled ? RUN_OUTCOMES.CANCELLATIONS : RUN_OUTCOMES.SUCCESSES);
    return result;
  } catch (err) {
    metrics.record(reportKey, RUN_OUTCOMES.ERRORS);
    throw err;
  }
}

/**
 * Stop a saved run at the app server's request. The row is already cancelled by
 * then, so this is only about the work here: a job still waiting is dropped, a
 * job in flight has its queries cancelled, and a run this process never had is
 * simply nothing to do.
 */
async function handleReportCancel(payload) {
  const { runId } = payload || {};
  if (!runId) {
    throw new Error(`[report-runner] runId is required to stop a run (got keys=${Object.keys(payload || {}).join(',') || 'none'})`);
  }
  return stopRun(runId);
}

module.exports = { handleReportRun, handleReportCancel };
