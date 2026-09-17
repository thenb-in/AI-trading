const logger = require('../../logger');
const geographyController = require('../controllers/geographyController');
const { sendSuccess, sendError } = require('../utils/response');
const { HTTP_STATUS_NOT_FOUND, HTTP_STATUS_CONFLICT } = require('../constants/http');

async function getPlaces(req, res) {
  try {
    const { columns, data } = await geographyController.list(req.user?.company_id);
    return sendSuccess(res, { data: { columns, places: data } });
  } catch (error) {
    logger.error(`[geography] list failed: ${error.message}`, error);
    return sendError(res, { error });
  }
}

async function createPlace(req, res) {
  try {
    const place = await geographyController.create(req.body, req.user?.company_id, req.user?.id);
    return sendSuccess(res, { data: place, message: `${place.name} created` });
  } catch (error) {
    logger.error(`[geography] create failed: ${error.message}`, error);
    return sendError(res, { error });
  }
}

async function updatePlace(req, res) {
  try {
    const { id } = req.params;
    const place = await geographyController.update(id, req.user?.company_id, req.body);
    if (!place) {
      return sendError(res, {
        statusCode: HTTP_STATUS_NOT_FOUND,
        message: `No place ${id} in this company`
      });
    }
    return sendSuccess(res, { data: place, message: `${place.name} updated` });
  } catch (error) {
    logger.error(`[geography] update ${req.params?.id} failed: ${error.message}`, error);
    return sendError(res, { error });
  }
}

async function deletePlace(req, res) {
  try {
    const { id } = req.params;
    const { removed, reason, name } = await geographyController.remove(id, req.user?.company_id);
    if (reason) {
      return sendError(res, { statusCode: HTTP_STATUS_CONFLICT, message: reason });
    }
    if (!removed) {
      return sendError(res, {
        statusCode: HTTP_STATUS_NOT_FOUND,
        message: `No place ${id} in this company`
      });
    }
    return sendSuccess(res, { message: `${name} deleted` });
  } catch (error) {
    logger.error(`[geography] delete ${req.params?.id} failed: ${error.message}`, error);
    return sendError(res, { error });
  }
}

module.exports = { getPlaces, createPlace, updatePlace, deletePlace };
