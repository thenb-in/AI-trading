const namingSeriesService = require('../services/namingSeriesService');
const namingSeriesColumns = require('../constants/columns/namingSeriesColumns');
const { getNamingSeriesMasters } = require('../utils/namingSeriesRegistry');
const { formatCode } = require('../utils/namingSeriesTemplate');

const toWire = (row) => ({
  id: row.id,
  master: row.master,
  template: row.template,
  count: row.count,
  is_default: row.isDefault,
  next_code: formatCode(row.template, row.count + 1)
});

const namingSeriesController = {
  async list(companyId) {
    const rows = await namingSeriesService.listForCompany(companyId);
    return { columns: namingSeriesColumns, namingSeries: rows.map(toWire) };
  },

  masters: () => getNamingSeriesMasters(),

  async create(payload, companyId, userId) {
    return toWire(await namingSeriesService.create(payload, companyId, userId));
  },

  async update(id, companyId, payload) {
    const row = await namingSeriesService.update(id, companyId, payload);
    return row ? toWire(row) : null;
  },

  remove: (id, companyId) => namingSeriesService.remove(id, companyId)
};

module.exports = namingSeriesController;
