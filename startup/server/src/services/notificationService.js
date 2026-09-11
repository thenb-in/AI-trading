const { Op } = require('sequelize');
const { Notification, User } = require('../models');
const allowedPermissions = require('../utils/allowedPermissions');
const { MODULE_PERMISSION_CONSTANTS } = require('../constants/permissions');
const logger = require('../../logger');
const { NOTIFICATION_LOG_PREFIX } = require('../constants/notifications');
const { RULE_CHANNEL, DELIVERY_STATUS } = require('../constants/notificationRules');

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

    return Notification.create({
      channel: RULE_CHANNEL.IN_APP,
      status: DELIVERY_STATUS.SENT,
      ...row
    });
  },

  record: (row) => Notification.create(row),

  async listForUser(userId, companyId, { limit = 20, offset = 0 } = {}) {
    if (!userId || !companyId) {
      return [];
    }

    return Notification.findAll({
      where: {
        userId,
        companyId,
        channel: RULE_CHANNEL.IN_APP,
        status: DELIVERY_STATUS.SENT
      },
      order: [['created_at', 'DESC']],
      limit: Number(limit),
      offset: Number(offset)
    });
  },

  // The delivery log, read back: every attempt in a window, newest first.
  async listDeliveries(companyId, { startDate, endDate, userId, status, channel } = {}) {
    if (!companyId) {
      return [];
    }

    const where = { companyId, createdAt: { [Op.between]: [startDate, endDate] } };
    if (userId) {
      where.userId = userId;
    }
    if (status) {
      where.status = status;
    }
    if (channel) {
      where.channel = channel;
    }

    return Notification.findAll({
      where,
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'username'], required: false }],
      order: [['created_at', 'DESC']],
      raw: true,
      nest: true
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
      { where: { userId, companyId, isRead: false, channel: RULE_CHANNEL.IN_APP } }
    );
    return count;
  }
};

module.exports = notificationService;
