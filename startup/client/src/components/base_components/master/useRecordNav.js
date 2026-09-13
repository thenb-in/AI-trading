import { useCallback, useRef } from 'react';

/**
 * Previous/Next for the record open in a master's modal, walking the grid's rows
 * in the order the user sees them — after column sort, filters and grouping.
 *
 * The rows sit in a ref, not state: the grid reports them on every render of its
 * own, and the arrows only need them when the modal renders. A new record, or
 * one no longer in the grid (filtered out since), has no neighbours, so
 * `recordNav` is null and the arrows are left out.
 */
const useRecordNav = (selectedRow, openRow) => {
  const visibleRowsRef = useRef([]);
  const handleVisibleRowsChange = useCallback((visibleRows) => {
    visibleRowsRef.current = visibleRows;
  }, []);

  const visibleRows = visibleRowsRef.current;
  const index = selectedRow ? visibleRows.findIndex((row) => row.id === selectedRow.id) : -1;
  const recordNav = index >= 0
    ? {
        position: index + 1,
        total: visibleRows.length,
        onPrevious: index > 0 ? () => openRow(visibleRows[index - 1]) : null,
        onNext: index < visibleRows.length - 1 ? () => openRow(visibleRows[index + 1]) : null,
      }
    : null;

  return { handleVisibleRowsChange, recordNav };
};

export { useRecordNav };
