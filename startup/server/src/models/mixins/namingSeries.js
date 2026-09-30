const { Op } = require('sequelize');
const { registerNamingSeriesMaster } = require('../../utils/namingSeriesRegistry');
const { formatCode, countFromCode } = require('../../utils/namingSeriesTemplate');

const isBlank = (value) => value === undefined || value === null || String(value).trim() === '';

const positiveId = (value) => {
  const id = parseInt(value, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
};

/**
 * Give a model's new rows their code from the company's naming series for `master`.
 *
 *   attachNamingSeries(Employee, { master: 'employee', field: 'emp_code' });
 *
 * A model whose rows belong to more than one master names them all and says which one a
 * row uses — the naming series screen then offers each of them separately:
 *
 *   attachNamingSeries(BOM, {
 *     master: ['bom', 'operation'],
 *     pickMaster: (bom) => (bom.isOperation ? 'operation' : 'bom'),
 *     field: 'code',
 *     seriesField: 'namingSeriesId'
 *   });
 *
 * - Runs on beforeValidate, so a NOT NULL code column is filled before validation reads it,
 *   and only for inserts (create/bulkCreate), never for Model.update.
 * - The counter moves inside the caller's transaction (options.transaction): the row stays
 *   locked until that transaction ends, and a rolled-back insert gives its number back.
 * - A company with no default series for the master is left alone when the code column is
 *   nullable; where the column is NOT NULL the row cannot be coded at all, so it says so
 *   rather than failing later on a null.
 * - A code typed by hand that fits the template pushes the counter past it, so the series
 *   never hands that code out again.
 * - With `seriesField`, a row may name the series to number it from (any series of its own
 *   master and company); the field is then written back with the series that numbered it,
 *   or null when the code was typed by hand and no series was spent.
 */
function attachNamingSeries(Model, { master, field, seriesField, pickMaster }) {
  const masters = [].concat(master);
  const chooseMaster = pickMaster ?? (() => masters[0]);
  masters.forEach((name) => registerNamingSeriesMaster(name, field));

  Model.addHook('beforeValidate', async (instance, options) => {
    // A static Model.update validates a throwaway build of the changed fields, which also
    // reads as a new record — its `where` is what tells it apart from a real insert.
    if (!instance.isNewRecord || options.where) {
      return;
    }
    const { transaction } = options;
    const { NamingSeries } = Model.sequelize.models;
    const companyId = instance.get('companyId');
    const masterName = chooseMaster(instance);
    // A series named on the row wins over the master's default, as long as it is one of
    // this company's series for this master.
    const chosenId = seriesField ? positiveId(instance.get(seriesField)) : null;
    const series = await NamingSeries.findOne({
      where: { companyId, master: masterName, ...(chosenId ? { id: chosenId } : { isDefault: true }) },
      transaction
    });
    if (!series) {
      if (chosenId) {
        throw new Error(`Naming series ${chosenId} is not one of ${masterName}'s series for company ${companyId}.`);
      }
      // A code the table insists on can only come from a series, so say what is missing here
      // rather than let the insert fail on a null nobody can trace back.
      if (Model.rawAttributes[field].allowNull === false && isBlank(instance.get(field))) {
        throw new Error(`Company ${companyId} has no default naming series for ${masterName}, so this ${Model.name} cannot be numbered. Add one on the Naming Series screen.`);
      }
      return;
    }

    const typedCode = instance.get(field);
    if (!isBlank(typedCode)) {
      // A hand-written code spends no series, so the row must not claim one.
      if (seriesField) {
        instance.set(seriesField, null);
      }
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
    if (seriesField) {
      instance.set(seriesField, series.id);
    }
  });
}

module.exports = { attachNamingSeries };
