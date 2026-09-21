const { Op } = require('sequelize');
const { sequelize, NamingSeries } = require('../models');

// Wire (snake_case) -> model attributes. `master` is only ever set on create.
const toAttributes = ({ master, template, count, is_default: isDefault } = {}) =>
  Object.fromEntries(
    Object.entries({ master, template: template?.trim(), count, isDefault })
      .filter(([, value]) => value !== undefined)
  );

// Only one series per master is the default — the one new rows are numbered from. Cleared
// before the new default is written, or the one-default unique index would reject it.
const clearDefaults = (companyId, master, exceptId, transaction) =>
  NamingSeries.update(
    { isDefault: false },
    { where: { companyId, master, isDefault: true, id: { [Op.ne]: exceptId ?? 0 } }, transaction }
  );

const namingSeriesService = {
  listForCompany: (companyId) =>
    NamingSeries.findAll({
      where: { companyId },
      order: [['master', 'ASC'], ['isDefault', 'DESC'], ['template', 'ASC']]
    }),

  getDefault: (master, companyId) =>
    NamingSeries.findOne({ where: { companyId, master, isDefault: true } }),

  create: (payload, companyId, createdBy) => sequelize.transaction(async (transaction) => {
    const attributes = toAttributes(payload);
    const defaults = await NamingSeries.count({
      where: { companyId, master: attributes.master, isDefault: true },
      transaction
    });
    // The first series for a master is the one that numbers it; nobody should have to tick
    // a box to switch it on.
    const isDefault = Boolean(attributes.isDefault) || defaults === 0;
    if (isDefault) {
      await clearDefaults(companyId, attributes.master, null, transaction);
    }
    return NamingSeries.create({ ...attributes, isDefault, companyId, createdBy }, { transaction });
  }),

  update: (id, companyId, payload) => sequelize.transaction(async (transaction) => {
    const row = await NamingSeries.findOne({ where: { id, companyId }, transaction });
    if (!row) {
      return null;
    }
    const { master: _master, ...attributes } = toAttributes(payload);
    if (attributes.isDefault) {
      await clearDefaults(companyId, row.master, row.id, transaction);
    }
    return row.update(attributes, { transaction });
  }),

  remove: (id, companyId) => NamingSeries.destroy({ where: { id, companyId } })
};

module.exports = namingSeriesService;
