const notificationService = require('../services/notificationService');
const { formatNotifications } = require('./notificationFormatter');


const notificationController = {
  async list(userId, companyId, limit, offset) {
    const rows = await notificationService.listForUser(userId, companyId, { limit, offset });
    return formatNotifications(rows);
  },

  async markRead(id, userId, companyId) {
    return notificationService.markRead(id, userId, companyId);
  },

  async markAllRead(userId, companyId) {
    return notificationService.markAllRead(userId, companyId);
  }
};

module.exports = notificationController;
