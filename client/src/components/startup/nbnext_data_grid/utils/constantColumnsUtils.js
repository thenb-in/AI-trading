/**
 * Utility functions for detecting and processing constant columns
 */

/**
 * Detects columns where all rows have the same value
 * @param {Array} rows - Array of row objects
 * @param {Array} columns - Array of column definitions
 * @returns {Object} - { constantColumns: Map, filteredColumns: Array }
 */
function detectConstantColumns(rows, columns) {
  if (!rows || rows.length === 0 || !columns || columns.length === 0) {
    return {
      constantColumns: new Map(),
      filteredColumns: columns || []
    };
  }

  const constantColumns = new Map();
  const columnFieldMap = new Map();
  
  // Create a map of field -> column for quick lookup
  columns.forEach(col => {
    const field = col.field || col.key;
    if (field) {
      columnFieldMap.set(field, col);
    }
  });

  // Check each column to see if all rows have the same value
  columnFieldMap.forEach((col, field) => {
    // Skip action columns, hidden columns, skip_insight, and certain types
    // Also skip fields with "action" in the name (e.g., "lock_action", "actions")
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

    // Get all values for this column
    const values = rows.map(row => {
      const rowData = row._row || row;
      return rowData[field];
    });

    // Check if all rows have the same value (including null/undefined/empty string)
    if (values.length === rows.length && values.length > 0) {
      const firstValue = values[0];
      const allSame = values.every(val => {
        // Handle null/undefined comparison
        if (val === null || val === undefined) {
          return firstValue === null || firstValue === undefined;
        }
        if (firstValue === null || firstValue === undefined) {
          return false;
        }
        // Deep comparison for objects/arrays
        if (typeof val === 'object' && val !== null) {
          return JSON.stringify(val) === JSON.stringify(firstValue);
        }
        // String comparison (case-sensitive)
        return String(val) === String(firstValue);
      });

      if (allSame) {
        // Store the constant value and column info
        constantColumns.set(field, {
          field,
          value: firstValue,
          displayName: col.display_name || col.headerName || col.label || col.name || field,
          type: col.type || 'string'
        });
      }
    }
  });

  // Filter out constant columns from the columns array
  const filteredColumns = columns.filter(col => {
    const field = col.field || col.key;
    return !constantColumns.has(field);
  });

  return {
    constantColumns,
    filteredColumns
  };
}

/**
 * Converts constant columns Map to summary object format
 * @param {Map} constantColumns - Map of constant columns
 * @returns {Object} - Summary object with key-value pairs
 */
function constantColumnsToSummary(constantColumns) {
  if (!constantColumns || constantColumns.size === 0) {
    return {};
  }

  const summary = {};
  constantColumns.forEach(({ field, value, displayName }, key) => {
    // Use displayName as key for better readability in Excel.
    // Ensure keys are unique to avoid overwriting when displayName duplicates exist.
    void key;
    const baseKey = (typeof displayName === 'string' && displayName.trim())
      ? displayName.trim()
      : field;
    let finalKey = baseKey;
    if (Object.prototype.hasOwnProperty.call(summary, finalKey)) {
      finalKey = `${baseKey} (${field})`;
    }
    summary[finalKey] = value;
  });

  return summary;
}

export {
  detectConstantColumns,
  constantColumnsToSummary
};
