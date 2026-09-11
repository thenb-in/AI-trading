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

module.exports = {
  isDebugMode,
  keepColumnData
};
