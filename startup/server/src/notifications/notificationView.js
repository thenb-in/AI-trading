const logger = require('../../logger');
const notificationController = require('./notificationController');
const { sendSuccess, sendError } = require('../utils/response');


async function getNotifications(req, res) {
  try {
    const userId = req.user?.id || null;
    const companyId = req.user?.company_id || null;
    const limit = req.query.limit || 20;
    const offset = req.query.offset || 0;

    const notifications = await notificationController.list(userId, companyId, limit, offset);
    return sendSuccess(res, { data: { notifications } });
  } catch (error) {
    logger.error('Get notifications error', error);
    return sendError(res, { error });
  }
}

async function markRead(req, res) {
  try {
    const userId = req.user?.id || null;
    const companyId = req.user?.company_id || null;
    const { id } = req.params;

    const updated = await notificationController.markRead(id, userId, companyId);
    return sendSuccess(res, { data: { updated } });
  } catch (error) {
    logger.error(`Mark notification read error: ${req.params?.id}`, error);
    return sendError(res, { error });
  }
}

async function markAllRead(req, res) {
  try {
    const userId = req.user?.id || null;
    const companyId = req.user?.company_id || null;

    const updatedCount = await notificationController.markAllRead(userId, companyId);
    return sendSuccess(res, { data: { updatedCount } });
  } catch (error) {
    logger.error('Mark all notifications read error', error);
    return sendError(res, { error });
  }
}

module.exports = { getNotifications, markRead, markAllRead };
