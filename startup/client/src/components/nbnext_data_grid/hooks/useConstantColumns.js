import { useMemo } from 'react';
import { detectConstantColumns } from '../utils/constantColumnsUtils';

/**
 * Hook to detect columns where all rows have the same value
 * @param {Array} rows - Array of row objects
 * @param {Array} columns - Array of column definitions
 * @returns {Object} - { constantColumns: Map, filteredColumns: Array, filteredRows: Array }
 */
function useConstantColumns(rows, columns) {
  return useMemo(() => {
    const { constantColumns, filteredColumns } = detectConstantColumns(rows, columns);
    
    return {
      constantColumns,
      filteredColumns,
      filteredRows: rows
    };
  }, [rows, columns]);
}

export {
  useConstantColumns
};
