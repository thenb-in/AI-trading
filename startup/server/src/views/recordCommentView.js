const logger = require('../../logger');
const recordCommentController = require('../controllers/recordCommentController');
const { sendSuccess, sendError } = require('../utils/response');
const {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_CREATED,
  HTTP_STATUS_FORBIDDEN,
  HTTP_STATUS_NOT_FOUND
} = require('../constants/http');

/** Both reads and writes name the record the same way the Drive does. */
const readTarget = (source) => ({
  objectName: source.objectName,
  objectId: source.objectId
});

const missingTarget = (res, { objectName, objectId }) => sendError(res, {
  statusCode: HTTP_STATUS_BAD_REQUEST,
  message: `objectName and objectId are required, got objectName: ${objectName}, objectId: ${objectId}`
});

const hasTarget = ({ objectName, objectId }) => Boolean(objectName) && objectId !== undefined && objectId !== null && objectId !== '';

async function getComments(req, res) {
  const target = readTarget(req.query);
  if (!hasTarget(target)) {
    return missingTarget(res, target);
  }
  try {
    const result = await recordCommentController.listComments(req.user.company_id, target.objectName, target.objectId, req.user.id);
    if (!result.ok) {
      return sendError(res, { statusCode: HTTP_STATUS_FORBIDDEN, message: result.reason });
    }
    return sendSuccess(res, { data: result.comments });
  } catch (error) {
    logger.error(`Get comments on ${target.objectName} ${target.objectId} failed: ${error.message}`, error);
    return sendError(res, { error });
  }
}

async function createComment(req, res) {
  const target = readTarget(req.body);
  if (!hasTarget(target)) {
    return missingTarget(res, target);
  }
  try {
    const result = await recordCommentController.addComment({
      companyId: req.user.company_id,
      objectName: target.objectName,
      objectId: target.objectId,
      body: req.body.body,
      createdBy: req.user.id
    });
    if (!result.ok) {
      return sendError(res, {
        statusCode: result.forbidden ? HTTP_STATUS_FORBIDDEN : HTTP_STATUS_BAD_REQUEST,
        message: result.reason
      });
    }
    return sendSuccess(res, { statusCode: HTTP_STATUS_CREATED, data: result.comment });
  } catch (error) {
    logger.error(`Add comment on ${target.objectName} ${target.objectId} failed: ${error.message}`, error);
    return sendError(res, { error });
  }
}

async function deleteComment(req, res) {
  const { id } = req.params;
  try {
    const result = await recordCommentController.removeComment(parseInt(id, 10), req.user.company_id, req.user.id);
    if (!result.ok) {
      return sendError(res, {
        statusCode: result.notFound ? HTTP_STATUS_NOT_FOUND : HTTP_STATUS_FORBIDDEN,
        message: result.reason
      });
    }
    return sendSuccess(res, { message: `Comment ${id} deleted` });
  } catch (error) {
    logger.error(`Delete comment ${id} failed: ${error.message}`, error);
    return sendError(res, { error });
  }
}

module.exports = { getComments, createComment, deleteComment };
