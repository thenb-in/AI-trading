const { Op } = require('sequelize');
const { Announcement } = require('../models');

const announcementService = {
  listForCompany: (companyId) =>
    Announcement.findAll({
      where: { companyId },
      order: [['starts_at', 'DESC'], ['created_at', 'DESC']]
    }),

  /**
   * Announcements running right now for this company: switched on, started, and
   * not yet finished. Who they are FOR is decided on the role, above this.
   */
  listRunning: (companyId, now) =>
    Announcement.findAll({
      where: {
        companyId,
        isActive: true,
        [Op.and]: [
          { [Op.or]: [{ startsAt: null }, { startsAt: { [Op.lte]: now } }] },
          { [Op.or]: [{ endsAt: null }, { endsAt: { [Op.gte]: now } }] }
        ]
      },
      order: [['severity', 'ASC'], ['created_at', 'DESC']]
    }),

  getById: (id, companyId) => Announcement.findOne({ where: { id, companyId } }),

  create: (payload, companyId, createdBy) =>
    Announcement.create({ ...payload, companyId, createdBy }),

  update: async (id, companyId, payload) => {
    const [count] = await Announcement.update(payload, { where: { id, companyId } });
    return count > 0;
  },

  remove: (id, companyId) => Announcement.destroy({ where: { id, companyId } })
};

module.exports = announcementService;
