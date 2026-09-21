const { UniqueConstraintError } = require('sequelize');
const logger = require('../../logger');
const namingSeriesController = require('../controllers/namingSeriesController');
const { sendSuccess, sendError } = require('../utils/response');
const { HTTP_STATUS_NOT_FOUND, HTTP_STATUS_CONFLICT } = require('../constants/http');

const isDuplicateTemplate = (error) => error instanceof UniqueConstraintError;

async function getSeries(req, res) {
  try {
    const data = await namingSeriesController.list(req.user?.company_id);
    return sendSuccess(res, { data });
  } catch (error) {
    logger.error(`[naming-series] list failed for company ${req.user?.company_id}: ${error.message}`, error);
    return sendError(res, { error });
  }
}

async function getMasterForSeries(req, res) {
  try {
    return sendSuccess(res, { data: { masters: namingSeriesController.masters() } });
  } catch (error) {
    logger.error(`[naming-series] master list failed: ${error.message}`, error);
    return sendError(res, { error });
  }
}

async function createSeries(req, res) {
  try {
    const series = await namingSeriesController.create(req.body, req.user?.company_id, req.user?.id);
    return sendSuccess(res, { data: series, message: `${series.template} created for ${series.master}` });
  } catch (error) {
    if (isDuplicateTemplate(error)) {
      return sendError(res, {
        statusCode: HTTP_STATUS_CONFLICT,
        message: `${req.body?.template} is already a naming series for ${req.body?.master}`
      });
    }
    logger.error(`[naming-series] create ${req.body?.template} for ${req.body?.master} failed: ${error.message}`, error);
    return sendError(res, { error });
  }
}

async function updateSeries(req, res) {
  const { id } = req.params;
  try {
    const series = await namingSeriesController.update(id, req.user?.company_id, req.body);
    if (!series) {
      return sendError(res, { statusCode: HTTP_STATUS_NOT_FOUND, message: `No naming series ${id} in this company` });
    }
    return sendSuccess(res, { data: series, message: `${series.template} updated` });
  } catch (error) {
    if (isDuplicateTemplate(error)) {
      return sendError(res, {
        statusCode: HTTP_STATUS_CONFLICT,
        message: `${req.body?.template} is already a naming series for this master`
      });
    }
    logger.error(`[naming-series] update ${id} failed: ${error.message}`, error);
    return sendError(res, { error });
  }
}

async function deleteSeries(req, res) {
  const { id } = req.params;
  try {
    const removed = await namingSeriesController.remove(id, req.user?.company_id);
    if (!removed) {
      return sendError(res, { statusCode: HTTP_STATUS_NOT_FOUND, message: `No naming series ${id} in this company` });
    }
    return sendSuccess(res, { message: `Naming series ${id} deleted` });
  } catch (error) {
    logger.error(`[naming-series] delete ${id} failed: ${error.message}`, error);
    return sendError(res, { error });
  }
}

module.exports = { getSeries, getMasterForSeries, createSeries, updateSeries, deleteSeries };
