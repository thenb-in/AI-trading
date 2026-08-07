const logger = require('../../logger');
const reportRunService = require('../services/reportRunService');
const { payloadStream, removePayloads } = require('../utils/reportPayloadStore');
const { sendSuccess, sendError } = require('../utils/response');
const {
  HTTP_STATUS_NOT_FOUND,
  HTTP_STATUS_BAD_REQUEST,
  API_MESSAGE_NOT_FOUND
} = require('../constants/http');
const { cancelReportRun } = require('../socket/init_setup/reports/cancelReportRun');
const { REPORT_RUN_STATUS, REPORT_RUN_LOG_PREFIX } = require('../constants/reportRuns');

async function listRuns(req, res) {
  try {
    const { id: userId, company_id: companyId } = req.user || {};
    const runs = await reportRunService.listForUser(userId, companyId, req.query);
    return sendSuccess(res, { data: { runs } });
  } catch (error) {
    logger.error(`${REPORT_RUN_LOG_PREFIX} list failed: ${error.message}`, error);
    return sendError(res, { error });
  }
}

async function getRun(req, res) {
  try {
    const { company_id: companyId } = req.user || {};
    const run = await reportRunService.getById(req.params.id, companyId);
    if (!run) {
      return sendError(res, { statusCode: HTTP_STATUS_NOT_FOUND, message: API_MESSAGE_NOT_FOUND });
    }
    return sendSuccess(res, { data: { run } });
  } catch (error) {
    logger.error(`${REPORT_RUN_LOG_PREFIX} get failed id=${req.params?.id}: ${error.message}`, error);
    return sendError(res, { error });
  }
}

/**
 * Stream the stored payload back still gzipped. Setting Content-Encoding lets
 * the browser inflate it, so a multi-megabyte report never gets parsed into
 * app-server memory on its way through.
 */
async function getRunPayload(req, res) {
  try {
    const { company_id: companyId } = req.user || {};
    const run = await reportRunService.getById(req.params.id, companyId);
    if (!run) {
      return sendError(res, { statusCode: HTTP_STATUS_NOT_FOUND, message: API_MESSAGE_NOT_FOUND });
    }
    if (run.status !== REPORT_RUN_STATUS.DONE) {
      return sendError(res, {
        statusCode: HTTP_STATUS_BAD_REQUEST,
        message: `Report run is ${run.status}, no payload to serve`
      });
    }

    // Resolved through Drive as the run's owner — Drive scopes by creator, and
    // the file was created as that user when the run finished.
    const stream = await payloadStream({
      driveFileId: run.driveFileId,
      companyId: run.companyId,
      userId: run.userId
    });
    if (!stream) {
      return sendError(res, {
        statusCode: HTTP_STATUS_NOT_FOUND,
        message: 'Report payload is no longer available. Run the report again.'
      });
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Encoding', 'gzip');
    stream.on('error', (err) => {
      logger.error(`${REPORT_RUN_LOG_PREFIX} payload stream failed id=${run.id}: ${err.message} - stack: ${err.stack}`);
      res.destroy(err);
    });
    return stream.pipe(res);
  } catch (error) {
    logger.error(`${REPORT_RUN_LOG_PREFIX} payload failed id=${req.params?.id}: ${error.message}`, error);
    return sendError(res, { error });
  }
}

/**
 * Stop a run that is still queued or running.
 *
 * The cancel itself is one scoped update, so two people (or two tabs) pressing
 * stop cannot both "win" — the second is told the run was already finished
 * rather than being allowed to write over a result.
 */
async function cancelRun(req, res) {
  try {
    const { company_id: companyId } = req.user || {};
    const run = await reportRunService.getById(req.params.id, companyId);
    if (!run) {
      return sendError(res, { statusCode: HTTP_STATUS_NOT_FOUND, message: API_MESSAGE_NOT_FOUND });
    }
    const cancelled = await reportRunService.cancel(run.id, companyId);
    if (!cancelled) {
      return sendError(res, {
        statusCode: HTTP_STATUS_BAD_REQUEST,
        message: `Report run is already ${run.status}, there is nothing to stop.`
      });
    }
    logger.info(`${REPORT_RUN_LOG_PREFIX} run ${run.id} cancelled by user ${run.userId} (was ${run.status})`);
    await cancelReportRun(run);
    return sendSuccess(res, { data: { cancelled: true }, message: 'Report run stopped.' });
  } catch (error) {
    logger.error(`${REPORT_RUN_LOG_PREFIX} cancel failed id=${req.params?.id}: ${error.message}`, error);
    return sendError(res, { error });
  }
}

async function deleteRun(req, res) {
  try {
    const { company_id: companyId } = req.user || {};
    const run = await reportRunService.getById(req.params.id, companyId);
    if (!run) {
      return sendError(res, { statusCode: HTTP_STATUS_NOT_FOUND, message: API_MESSAGE_NOT_FOUND });
    }
    // Deleting a run that is still working would leave the runner computing for
    // a row that no longer exists, so a delete stops it first.
    if (await reportRunService.cancel(run.id, companyId)) {
      await cancelReportRun(run);
    }
    await reportRunService.destroyById(run.id, companyId);
    await removePayloads([{ driveFileId: run.driveFileId, companyId: run.companyId, userId: run.userId }]);
    return sendSuccess(res, { data: { deleted: true } });
  } catch (error) {
    logger.error(`${REPORT_RUN_LOG_PREFIX} delete failed id=${req.params?.id}: ${error.message}`, error);
    return sendError(res, { error });
  }
}

module.exports = { listRuns, getRun, getRunPayload, cancelRun, deleteRun };
