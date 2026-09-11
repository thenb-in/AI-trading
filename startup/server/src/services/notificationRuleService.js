const { NotificationRule, User } = require('../models');
const { RULE_WIRE_TO_MODEL } = require('../constants/notificationRules');


const toModelAttributes = (payload = {}) =>
  Object.fromEntries(
    Object.entries(RULE_WIRE_TO_MODEL)
      .filter(([wire]) => Object.hasOwn(payload, wire))
      .map(([wire, attribute]) => [attribute, payload[wire]])
  );


const CREATED_BY_USER = { model: User, as: 'createdByUser', required: false, attributes: ['id', 'name'] };

const notificationRuleService = {
  listForCompany: (companyId) =>
    NotificationRule.findAll({
      where: { companyId },
      include: [CREATED_BY_USER],
      order: [['created_at', 'DESC']]
    }),

  getById: (id, companyId) => NotificationRule.findOne({ where: { id, companyId } }),

  findActiveByName: (companyId, name) =>
    NotificationRule.findOne({ where: { companyId, name, isActive: true } }),

  create: (payload, companyId, createdBy) =>
    NotificationRule.create({ ...toModelAttributes(payload), companyId, createdBy }),

  update: async (id, companyId, payload) => {
    const [count] = await NotificationRule.update(
      toModelAttributes(payload),
      { where: { id, companyId } }
    );
    return count > 0;
  },

  remove: (id, companyId) => NotificationRule.destroy({ where: { id, companyId } })
};

module.exports = notificationRuleService;
