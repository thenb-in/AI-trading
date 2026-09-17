const { Geography } = require('../models');

const geographyService = {
  listForCompany: (companyId) =>
    Geography.findAll({
      where: { companyId },
      order: [['name', 'ASC']]
    }),

  getById: (id, companyId) => Geography.findOne({ where: { id, companyId } }),

  countChildren: (id, companyId) => Geography.count({ where: { parentId: id, companyId } }),

  create: (payload, companyId, createdBy) =>
    Geography.create({ ...payload, companyId, createdBy }),

  update: async (id, companyId, payload) => {
    const [count] = await Geography.update(payload, { where: { id, companyId } });
    return count > 0;
  },

  remove: (id, companyId) => Geography.destroy({ where: { id, companyId } })
};

module.exports = geographyService;
