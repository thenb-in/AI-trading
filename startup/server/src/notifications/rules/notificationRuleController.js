const notificationRuleService = require('../../services/notificationRuleService');
const userService = require('../../services/userService');
const { deliverRule } = require('./delivery/deliverRule');
const {
  formatNotificationRule,
  formatNotificationRules
} = require('./notificationRuleFormatter');

const notificationRuleController = {
  async list(companyId) {
    const [rows, { roles }] = await Promise.all([
      notificationRuleService.listForCompany(companyId),
      userService.getAllUsers(companyId)
    ]);
    const roleNames = Object.fromEntries(
      roles.map((role) => [String(role.id), role.display_name || role.name])
    );
    return formatNotificationRules(rows, { roleNames });
  },


  async create(payload, companyId, userId) {
    const row = await notificationRuleService.create(payload, companyId, userId);
    return formatNotificationRule(row);
  },

  async update(id, companyId, payload) {
    const updated = await notificationRuleService.update(id, companyId, payload);
    if (!updated) {
      return null;
    }
    const row = await notificationRuleService.getById(id, companyId);
    return formatNotificationRule(row);
  },

  async remove(id, companyId) {
    return notificationRuleService.remove(id, companyId);
  },

  async sendNow(id, companyId) {
    const rule = await notificationRuleService.getById(id, companyId);
    if (!rule) {
      return null;
    }
    return deliverRule(rule);
  }
};

module.exports = notificationRuleController;
