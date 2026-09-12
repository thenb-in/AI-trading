// Shared filter helpers used across server-side code.

/**
 * Whether debug mode is enabled for the given filters.
 */
function isDebugMode(filters = {}) {
  return filters?.is_debug_mode === true || filters?.is_debug_mode === 'true';
}

/** Every row, keeping only the data that has a column in the report. */
function keepColumnData(data, columns, exception_columns = []) {
  return data.map(row => {
    const keptRow = {};
    columns.forEach(column => {
      let value = row[column.key] !== undefined && row[column.key] !== null
        ? row[column.key]
        : row[`${column.key}_computed`];
      if ((value === undefined || value === null) && column.type === 'number' && !column.nullable) {
        value = 0;
      }
      keptRow[column.key] = value;

      if (column.export && column.export !== column.key) {
        const exportValue = row[column.export] !== undefined && row[column.export] !== null
          ? row[column.export]
          : row[`${column.export}_computed`];
        keptRow[column.export] = exportValue;
      }
    });
    exception_columns.forEach(column => {
      const value = row[column];
      keptRow[column] = value;
    });
    return keptRow;
  });
}

/**
 * A report's filters, as the request carried them.

 */
function processFilters(req) {
  const filters = { ...(req.query || {}) };

  for (const key of Object.keys(filters)) {
    if (filters[key] === 'true') {
      filters[key] = true;
    } else if (filters[key] === 'false') {
      filters[key] = false;
    } else if (filters[key] === 'null') {
      filters[key] = null;
    } else if (filters[key] === 'undefined') {
      filters[key] = undefined;
    }
  }

  // Milliseconds are left as parsed: the day's last second is the boundary
  // reports have always been written against.
  if (filters.start_date) {
    filters.start_date = new Date(filters.start_date);
    filters.start_date.setHours(0, 0, 0);
  }
  if (filters.end_date) {
    filters.end_date = new Date(filters.end_date);
    filters.end_date.setHours(23, 59, 59);
  }

  filters.company_id = req.user?.company_id;

  return filters;
}

module.exports = {
  isDebugMode,
  keepColumnData,
  processFilters
};
