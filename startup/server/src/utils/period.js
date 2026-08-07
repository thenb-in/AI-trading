const { Op } = require('sequelize');
const { parseToYmd } = require('./dateUtils');

/**
 * The one place that decides whether a dated row applies to a date.
 *
 * A row is active on date D when it started on or before D and has not yet ended:
 *
 *     start <= D  AND  (end IS NULL OR end >= D)
 *
 * Both ends are included, and a null end means the end is not set, so the row is the current
 * one. Written by hand, the null case gets dropped — a row with no end date fails a plain
 * `end >= D` — which is why schedules, weekly offs, work orders, asset assignments and
 * employment periods all use these builders instead.
 *
 * The date is always required. There is deliberately no "defaults to today" form: a caller
 * that forgets to pass one should fail immediately rather than quietly return today's row
 * into a report about last year.
 *
 * Most tables call the two columns start_date and end_date, so callers say nothing. Tables
 * that name them differently declare it once with setPeriodColumns and pass
 * getPeriodColumns(Model) — done in the service that owns the model, since only the service
 * layer is allowed to reach for models.
 */

const DEFAULT_PERIOD_COLUMNS = { start: 'start_date', end: 'end_date' };

/**
 * Declare which two columns bound this model's period — the asset assignment uses
 * assigned_date / returned_date, the employment period uses joining_date /
 * resignation_date. Call once, in the model file.
 */
function setPeriodColumns(Model, columns) {
  Model.periodColumns = { ...DEFAULT_PERIOD_COLUMNS, ...columns };
  return Model;
}

const getPeriodColumns = (Model) => Model?.periodColumns ?? DEFAULT_PERIOD_COLUMNS;

const requireDate = (value, argName) => {
  const date = parseToYmd(value);
  if (!date) {
    throw new Error(`${argName} is required and must be a valid date, received: ${value}`);
  }
  return date;
};

/** Rows that apply on a single date. */
function activeOnWhere(date, columns = DEFAULT_PERIOD_COLUMNS) {
  const { start, end } = columns;
  const on = requireDate(date, 'date');

  return {
    [start]: { [Op.lte]: on },
    [Op.or]: [{ [end]: { [Op.gte]: on } }, { [end]: null }]
  };
}

/**
 * Rows that overlap a window — the form attendance and shift processing need, and the same
 * one an overlap check needs when saving a new row.
 *
 * `to` may be null, meaning the window itself has no end — the same rule the end column
 * follows. Then it only matters that a row has not already finished before the window
 * starts. A missing `to` is still an error; only an explicit null means open-ended.
 */
function activeBetweenWhere(from, to, columns = DEFAULT_PERIOD_COLUMNS) {
  const { start, end } = columns;
  const windowStart = requireDate(from, 'from');
  const notEndedBeforeWindow = { [Op.or]: [{ [end]: { [Op.gte]: windowStart } }, { [end]: null }] };

  if (to === null) {
    return notEndedBeforeWindow;
  }

  return { [start]: { [Op.lte]: requireDate(to, 'to') }, ...notEndedBeforeWindow };
}

/**
 * Combine a caller's own filters with a period clause. Nested under Op.and so an Op.or on
 * either side can never overwrite the other.
 */
const withPeriod = (where, periodWhere) => ({ [Op.and]: [where, periodWhere] });

/**
 * Check and parse the two ends of a dated row on the way in — the write-side counterpart to
 * the read-side builders above. A blank, null or missing end means no expiry and comes back
 * as null rather than throwing, the same meaning the queries give it.
 *
 * `allowSameDay` is the one thing that differs between owners of dated rows: a weekly off
 * assigned for a single day is legitimate, a shift schedule that starts and ends on the same
 * day is not.
 */
function parsePeriodBounds(start_date, end_date, { allowSameDay = true } = {}) {
  const hasEnd = end_date !== null && end_date !== undefined && String(end_date).trim() !== '';
  const startDate = new Date(start_date);
  const endDate = hasEnd ? new Date(end_date) : null;

  if (isNaN(startDate.getTime()) || (endDate && isNaN(endDate.getTime()))) {
    throw new Error(`Invalid date format: start_date=${start_date}, end_date=${end_date}`);
  }

  const endsTooEarly = allowSameDay ? startDate > endDate : startDate >= endDate;
  if (endDate && endsTooEarly) {
    const rule = allowSameDay ? 'on or before' : 'before';
    throw new Error(`start_date ${start_date} must be ${rule} end_date ${end_date}`);
  }

  return { startDate, endDate };
}

module.exports = {
  setPeriodColumns,
  getPeriodColumns,
  activeOnWhere,
  activeBetweenWhere,
  withPeriod,
  parsePeriodBounds
};
