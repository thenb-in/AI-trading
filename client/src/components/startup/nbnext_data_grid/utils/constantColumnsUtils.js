/**
 * Utility functions for detecting and processing constant columns.
 * A "constant column" is one where every visible row has the same value —
 * these can be moved to a summary header instead of repeating in every cell.
 */

/**
 * Detect columns where all rows have the same value.
 *
 * @param {Array} rows    - Array of row objects
 * @param {Array} columns - Array of column definitions
 * @returns {{ constantColumns: Map, filteredColumns: Array }}
 */
function detectConstantColumns(rows, columns) {
  if (!rows || rows.length === 0 || !columns || columns.length === 0) {
    return { constantColumns: new Map(), filteredColumns: columns || [] };
  }

  const constantColumns = new Map();
  const columnFieldMap = new Map();

  columns.forEach((col) => {
    const field = col.field || col.key;
    if (field) columnFieldMap.set(field, col);
  });

  columnFieldMap.forEach((col, field) => {
    // Skip action columns, hidden columns, insight-excluded columns.
    if (
      col.skip_insight === true ||
      col.type === 'action' ||
      col.hide === true ||
      col.hidden === true ||
      field === 'actions' ||
      (typeof field === 'string' && field.includes('_action'))
    ) {
      return;
    }

    const values = rows.map((row) => {
      const rowData = row._row || row;
      return rowData[field];
    });

    if (values.length === rows.length && values.length > 0) {
      const firstValue = values[0];
      const allSame = values.every((val) => {
        if (val === null || val === undefined) {
          return firstValue === null || firstValue === undefined;
        }
        if (firstValue === null || firstValue === undefined) return false;
        if (typeof val === 'object' && val !== null) {
          return JSON.stringify(val) === JSON.stringify(firstValue);
        }
        return String(val) === String(firstValue);
      });

      if (allSame) {
        constantColumns.set(field, {
          field,
          value: firstValue,
          displayName: col.display_name || col.headerName || col.label || col.name || field,
          type: col.type || 'string',
        });
      }
    }
  });

  const filteredColumns = columns.filter((col) => {
    const field = col.field || col.key;
    return !constantColumns.has(field);
  });

  return { constantColumns, filteredColumns };
}

/**
 * Convert a constantColumns Map to a plain summary object suitable for
 * passing to the Excel exporter's summary section.
 *
 * @param {Map} constantColumns
 * @returns {Object}
 */
function constantColumnsToSummary(constantColumns) {
  if (!constantColumns || constantColumns.size === 0) return {};

  const summary = {};
  constantColumns.forEach(({ field, value, displayName }) => {
    const baseKey =
      typeof displayName === 'string' && displayName.trim() ? displayName.trim() : field;
    let finalKey = baseKey;
    if (Object.prototype.hasOwnProperty.call(summary, finalKey)) {
      finalKey = `${baseKey} (${field})`;
    }
    summary[finalKey] = value;
  });

  return summary;
}

export { detectConstantColumns, constantColumnsToSummary };
