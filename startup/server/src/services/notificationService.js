const { Notification } = require('../models');
const allowedPermissions = require('../utils/allowedPermissions');
const { MODULE_PERMISSION_CONSTANTS } = require('../constants/permissions');
const logger = require('../../logger');
const { NOTIFICATION_LOG_PREFIX } = require('../constants/notifications');

const notificationService = {
  async create(row) {
    const { userId } = row || {};
    if (!userId) {
      return null;
    }

    const canViewNotifications = await allowedPermissions(
      userId,
      [MODULE_PERMISSION_CONSTANTS.VIEW_NOTIFICATION.name]
    );
    if (!canViewNotifications) {
      logger.debug(
        `${NOTIFICATION_LOG_PREFIX} skipped create for user ${userId}: missing view_notification permission`
      );
      return null;
    }

    return Notification.create(row);
  },

  async listForUser(userId, companyId, { limit = 20, offset = 0 } = {}) {
    if (!userId || !companyId) {
      return [];
    }

    return Notification.findAll({
      where: { userId, companyId },
      order: [['created_at', 'DESC']],
      limit: Number(limit),
      offset: Number(offset)
    });
  },

  async markRead(id, userId, companyId) {
    const [count] = await Notification.update(
      { isRead: true, readAt: new Date() },
      { where: { id, userId, companyId, isRead: false } }
    );
    return count > 0;
  },

  async markAllRead(userId, companyId) {
    const [count] = await Notification.update(
      { isRead: true, readAt: new Date() },
      { where: { userId, companyId, isRead: false } }
    );
    return count;
  }
};

module.exports = notificationService;
