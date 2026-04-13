import { useMemo } from 'react';
import { detectConstantColumns } from '../utils/constantColumnsUtils.js';

/**
 * Detect columns where all rows share the same value so they can be shown
 * in a summary header instead of repeating per cell.
 *
 * @param {Array} rows    - Array of row objects
 * @param {Array} columns - Array of column definitions
 * @returns {{ constantColumns: Map, filteredColumns: Array, filteredRows: Array }}
 */
function useConstantColumns(rows, columns) {
  return useMemo(() => {
    const { constantColumns, filteredColumns } = detectConstantColumns(rows, columns);
    return { constantColumns, filteredColumns, filteredRows: rows };
  }, [rows, columns]);
}

export { useConstantColumns };
