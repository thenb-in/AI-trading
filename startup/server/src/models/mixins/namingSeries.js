const { Op } = require('sequelize');
const { registerNamingSeriesMaster } = require('../../utils/namingSeriesRegistry');
const { formatCode, countFromCode } = require('../../utils/namingSeriesTemplate');

const isBlank = (value) => value === undefined || value === null || String(value).trim() === '';

/**
 * Give a model's new rows their code from the company's default naming series for `master`.
 *
 *   attachNamingSeries(Employee, { master: 'employee', field: 'emp_code' });
 *
 * - Runs on beforeValidate, so a NOT NULL code column is filled before validation reads it,
 *   and only for inserts (create/bulkCreate), never for Model.update.
 * - The counter moves inside the caller's transaction (options.transaction): the row stays
 *   locked until that transaction ends, and a rolled-back insert gives its number back.
 * - A company with no default series for the master is left alone — the row keeps whatever
 *   code it came with, exactly as before.
 * - A code typed by hand that fits the template pushes the counter past it, so the series
 *   never hands that code out again.
 */
function attachNamingSeries(Model, { master, field }) {
  registerNamingSeriesMaster(master, field);

  Model.addHook('beforeValidate', async (instance, options) => {
    if (!instance.isNewRecord || options.where) {
      return;
    }
    const { transaction } = options;
    const { NamingSeries } = Model.sequelize.models;
    const companyId = instance.get('company_id') ?? instance.get('companyId');
    const series = await NamingSeries.findOne({
      where: { companyId, master, isDefault: true },
      transaction
    });
    if (!series) {
      return;
    }

    const typedCode = instance.get(field);
    if (!isBlank(typedCode)) {
      const typedCount = countFromCode(series.template, typedCode);
      if (typedCount !== null) {
        await NamingSeries.update(
          { count: typedCount },
          { where: { id: series.id, count: { [Op.lt]: typedCount } }, transaction }
        );
      }
      return;
    }

    // One atomic UPDATE (count = count + 1) that hands back what the database landed on, so the
    // number below is this row's own even if another transaction moved the counter meanwhile.
    await series.increment('count', { by: 1, transaction });
    instance.set(field, formatCode(series.template, series.count));
  });
}

module.exports = { attachNamingSeries };
