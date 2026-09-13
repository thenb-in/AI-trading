import { formatDateOnlyYmd } from '@utils/dateTimeUtils';

const OPERATOR_LABELS = {
  equals: 'Equals',
  not_equals: 'Not Equals',
  contains: 'Contains',
  not_contains: 'Not Contains',
  starts_with: 'Starts With',
  ends_with: 'Ends With',
  greater_than: 'Greater Than',
  less_than: 'Less Than',
  greater_or_equal: 'Greater Or Equal',
  less_or_equal: 'Less Or Equal',
  before: 'Before',
  after: 'After',
  on_or_before: 'On Or Before',
  on_or_after: 'On Or After',
  is_set: 'Is Set',
  is_not_set: 'Is Not Set'
};

const OPERATORS_BY_TYPE = {
  text: ['equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with', 'is_set', 'is_not_set'],
  number: ['equals', 'not_equals', 'greater_than', 'less_than', 'greater_or_equal', 'less_or_equal', 'is_set', 'is_not_set'],
  boolean: ['equals', 'is_set', 'is_not_set'],
  // Dates read as before/after, not greater/less — same comparison, the
  // wording people actually use about dates.
  date: ['equals', 'not_equals', 'after', 'before', 'on_or_after', 'on_or_before', 'is_set', 'is_not_set']
};

const VALUE_LESS_OPERATORS = new Set(['is_set', 'is_not_set']);

const normalizeFieldType = (type) => {
  const normalized = String(type || 'text').toLowerCase();
  if (['number', 'numeric', 'integer', 'float', 'decimal', 'currency'].includes(normalized)) {
    return 'number';
  }
  if (['boolean', 'bool', 'checkbox'].includes(normalized)) {
    return 'boolean';
  }
  if (['date', 'datetime', 'timestamp'].includes(normalized)) {
    return 'date';
  }
  return 'text';
};

const getColumnKey = (column) => column?.key || column?.id || column?.field || '';

const getColumnLabel = (column) => column?.label || column?.display_name || column?.headerName || getColumnKey(column);

const getColumnType = (column) => normalizeFieldType(column?.type);

const getOperatorsForType = (type) => {
  const operators = OPERATORS_BY_TYPE[normalizeFieldType(type)] || OPERATORS_BY_TYPE.text;
  return operators.map((value) => ({ value, label: OPERATOR_LABELS[value] }));
};

const getFilterableColumns = (columns = []) =>
  columns
    .filter((column) => {
      const key = getColumnKey(column);
      if (!key || column?.hidden) return false;
      if (['actions', 'action'].includes(key)) return false;
      return true;
    })
    .map((column) => ({
      key: getColumnKey(column),
      label: getColumnLabel(column),
      type: getColumnType(column)
    }));

const createEmptyFilterRow = (columns = []) => {
  const filterableColumns = getFilterableColumns(columns);
  const firstColumn = filterableColumns[0];
  const field = firstColumn?.key || '';
  const operators = getOperatorsForType(firstColumn?.type);

  return {
    id: `filter-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    field,
    operator: operators[0]?.value || 'equals',
    value: ''
  };
};

const isValueLessOperator = (operator) => VALUE_LESS_OPERATORS.has(operator);

const isFilterRowComplete = (filter) => {
  if (!filter?.field || !filter?.operator) return false;
  if (isValueLessOperator(filter.operator)) return true;
  return String(filter.value ?? '').trim() !== '';
};

const isEmptyFilterRow = (filter) => {
  if (!filter?.field && !filter?.operator) return true;
  if (isValueLessOperator(filter?.operator)) return false;
  return !String(filter?.value ?? '').trim();
};

const getRowFieldValue = (row, field) => {
  if (!row || !field) return undefined;
  return row[field];
};

const normalizeText = (value) => String(value ?? '').trim().toLowerCase();

// Local time, not UTC. `toISOString().slice(0, 10)` would compare a row dated
// the 14th as the 13th for anyone east of UTC, so a "Delivery Date equals
// 14 May" filter would quietly match nothing.
const normalizeDateValue = (value) => {
  if (!value) return '';
  const ymd = formatDateOnlyYmd(value);
  return ymd || normalizeText(value);
};

const parseBooleanValue = (value) => {
  if (typeof value === 'boolean') return value;
  const normalized = normalizeText(value);
  if (['true', '1', 'yes', 'y'].includes(normalized)) return true;
  if (['false', '0', 'no', 'n'].includes(normalized)) return false;
  return null;
};

const isValueSet = (value) => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'boolean') return true;
  return String(value).trim() !== '';
};

const compareNumbers = (left, right) => {
  const a = Number(left);
  const b = Number(right);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  if (a === b) return 0;
  return a > b ? 1 : -1;
};

/**
 * Does one value satisfy one operator/operand pair?
 *
 * The operator semantics live here alone, so the standalone filter panel and
 * the data grid's own per-column filter bar can never drift apart on what
 * "starts with" or "greater than" means.
 *
 * @param {*} rawValue     the cell's value (or its display text, for the text
 *                         operators — the caller decides which it hands over)
 * @param {string} operator
 * @param {*} filterValue
 * @param {string} fieldType  normalized: text | number | boolean | date
 */
// One predicate per operator, per type. A lookup rather than a ladder: adding
// an operator is a line in a table, and a type that does not define one simply
// does not offer it.
const TEXT_MATCHERS = {
  equals: (row, want) => row === want,
  not_equals: (row, want) => row !== want,
  contains: (row, want) => row.includes(want),
  not_contains: (row, want) => !row.includes(want),
  starts_with: (row, want) => row.startsWith(want),
  ends_with: (row, want) => row.endsWith(want)
};

// Both take the comparison's sign, so numbers and dates share their wording.
const ORDER_MATCHERS = {
  equals: (sign) => sign === 0,
  not_equals: (sign) => sign !== 0,
  greater_than: (sign) => sign > 0,
  after: (sign) => sign > 0,
  less_than: (sign) => sign < 0,
  before: (sign) => sign < 0,
  greater_or_equal: (sign) => sign >= 0,
  on_or_after: (sign) => sign >= 0,
  less_or_equal: (sign) => sign <= 0,
  on_or_before: (sign) => sign <= 0
};

const compareDates = (left, right) => {
  const rowDate = normalizeDateValue(left);
  const filterDate = normalizeDateValue(right);
  // Unreadable on either side — an empty cell, an unparseable operand — so
  // there is nothing to order it against.
  if (!rowDate || !filterDate) return null;
  if (rowDate === filterDate) return 0;
  return rowDate > filterDate ? 1 : -1;
};

const matchesBoolean = (rawValue, operator, filterValue) => {
  const rowBool = parseBooleanValue(rawValue);
  const filterBool = parseBooleanValue(filterValue);
  if (filterBool === null) return true;
  if (rowBool === null) return false;
  return operator === 'not_equals' ? rowBool !== filterBool : rowBool === filterBool;
};

const matchesText = (rawValue, operator, filterValue) => {
  const filterText = normalizeText(filterValue);
  if (!filterText) return true;
  const matcher = TEXT_MATCHERS[operator];
  return matcher ? matcher(normalizeText(rawValue), filterText) : true;
};

const matchesOrder = (sign, operator) => {
  if (sign === null) return false;
  const matcher = ORDER_MATCHERS[operator];
  return matcher ? matcher(sign) : true;
};

/**
 * Does one value satisfy one operator/operand pair?
 *
 * The operator semantics live here alone, so the standalone filter panel and
 * the data grid's own per-column filter bar can never drift apart on what
 * "starts with" or "greater than" means.
 *
 * An operator a type has no matcher for passes rather than fails: the filter
 * is nonsense for that column, and silently dropping every row would look like
 * missing data.
 *
 * @param {*} rawValue     the cell's value (or its display text, for the text
 *                         operators — the caller decides which it hands over)
 * @param {string} operator
 * @param {*} filterValue
 * @param {string} fieldType  normalized: text | number | boolean | date
 */
const matchesValue = (rawValue, operator, filterValue, fieldType = 'text') => {
  if (operator === 'is_set') return isValueSet(rawValue);
  if (operator === 'is_not_set') return !isValueSet(rawValue);
  if (fieldType === 'boolean') return matchesBoolean(rawValue, operator, filterValue);
  if (fieldType === 'number') return matchesOrder(compareNumbers(rawValue, filterValue), operator);
  if (fieldType === 'date') return matchesOrder(compareDates(rawValue, filterValue), operator);
  return matchesText(rawValue, operator, filterValue);
};

const matchesAdvancedFilter = (row, filter, columns = []) => {
  if (!isFilterRowComplete(filter)) return true;

  const column = columns.find((item) => getColumnKey(item) === filter.field) || {
    key: filter.field,
    type: 'text'
  };
  return matchesValue(
    getRowFieldValue(row, filter.field),
    filter.operator,
    filter.value,
    getColumnType(column)
  );
};

const applyAdvancedFilters = (rows = [], filters = [], columns = []) => {
  const activeFilters = filters.filter(isFilterRowComplete);
  if (activeFilters.length === 0) return rows;

  return rows.filter((row) =>
    activeFilters.every((filter) => matchesAdvancedFilter(row, filter, columns))
  );
};

const applyMasterSearch = (rows = [], searchQuery = '') => {
  const query = String(searchQuery || '').trim().toLowerCase();
  if (!query) return rows;

  return rows.filter((row) =>
    Object.values(row).some((value) => value && String(value).toLowerCase().includes(query))
  );
};

const applyMasterListFilters = (rows = [], { searchQuery = '', advancedFilters = [], columns = [] } = {}) => {
  const searched = applyMasterSearch(rows, searchQuery);
  return applyAdvancedFilters(searched, advancedFilters, columns);
};

export {
  OPERATOR_LABELS,
  OPERATORS_BY_TYPE,
  normalizeFieldType,
  getOperatorsForType,
  getFilterableColumns,
  createEmptyFilterRow,
  isValueLessOperator,
  isFilterRowComplete,
  isEmptyFilterRow,
  matchesValue,
  matchesAdvancedFilter,
  applyAdvancedFilters,
  applyMasterSearch,
  applyMasterListFilters
};
