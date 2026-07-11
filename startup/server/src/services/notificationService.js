const { Notification } = require('../models');

const notificationService = {
  async create(row) {
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
