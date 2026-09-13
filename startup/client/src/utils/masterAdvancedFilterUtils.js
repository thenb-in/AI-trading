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
  is_set: 'Is Set',
  is_not_set: 'Is Not Set'
};

const OPERATORS_BY_TYPE = {
  text: ['equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with', 'is_set', 'is_not_set'],
  number: ['equals', 'not_equals', 'greater_than', 'less_than', 'greater_or_equal', 'less_or_equal', 'is_set', 'is_not_set'],
  boolean: ['equals', 'is_set', 'is_not_set'],
  date: ['equals', 'not_equals', 'greater_than', 'less_than', 'greater_or_equal', 'less_or_equal', 'is_set', 'is_not_set']
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

const matchesAdvancedFilter = (row, filter, columns = []) => {
  if (!isFilterRowComplete(filter)) return true;

  const column = columns.find((item) => getColumnKey(item) === filter.field) || {
    key: filter.field,
    type: 'text'
  };
  const fieldType = getColumnType(column);
  const operator = filter.operator;
  const rawValue = getRowFieldValue(row, filter.field);

  if (operator === 'is_set') return isValueSet(rawValue);
  if (operator === 'is_not_set') return !isValueSet(rawValue);

  if (fieldType === 'boolean') {
    const rowBool = parseBooleanValue(rawValue);
    const filterBool = parseBooleanValue(filter.value);
    if (filterBool === null) return true;
    if (rowBool === null) return false;
    return operator === 'equals' ? rowBool === filterBool : true;
  }

  if (fieldType === 'number') {
    const comparison = compareNumbers(rawValue, filter.value);
    if (comparison === null) return false;
    if (operator === 'equals') return comparison === 0;
    if (operator === 'not_equals') return comparison !== 0;
    if (operator === 'greater_than') return comparison > 0;
    if (operator === 'less_than') return comparison < 0;
    if (operator === 'greater_or_equal') return comparison >= 0;
    if (operator === 'less_or_equal') return comparison <= 0;
    return true;
  }

  if (fieldType === 'date') {
    const rowDate = normalizeDateValue(rawValue);
    const filterDate = normalizeDateValue(filter.value);
    if (!rowDate || !filterDate) return false;
    if (operator === 'equals') return rowDate === filterDate;
    if (operator === 'not_equals') return rowDate !== filterDate;
    if (operator === 'before' || operator === 'less_than') return rowDate < filterDate;
    if (operator === 'after' || operator === 'greater_than') return rowDate > filterDate;
    if (operator === 'greater_or_equal') return rowDate >= filterDate;
    if (operator === 'less_or_equal') return rowDate <= filterDate;
    return true;
  }

  const rowText = normalizeText(rawValue);
  const filterText = normalizeText(filter.value);
  if (!filterText) return true;

  if (operator === 'equals') return rowText === filterText;
  if (operator === 'not_equals') return rowText !== filterText;
  if (operator === 'contains') return rowText.includes(filterText);
  if (operator === 'not_contains') return !rowText.includes(filterText);
  if (operator === 'starts_with') return rowText.startsWith(filterText);
  if (operator === 'ends_with') return rowText.endsWith(filterText);

  return true;
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
  matchesAdvancedFilter,
  applyAdvancedFilters,
  applyMasterSearch,
  applyMasterListFilters
};
