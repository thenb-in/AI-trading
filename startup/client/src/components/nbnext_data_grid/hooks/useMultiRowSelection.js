import { useState, useEffect, useCallback, useMemo, useRef } from "react";

const toIdSet = (input) => {
  if (input instanceof Set) return new Set(input);
  if (Array.isArray(input)) return new Set(input);
  return new Set();
};

const setsAreEqual = (a, b) => {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
};

/**
 * Multi-row selection state for NbNextDataGrid.
 *
 * Controlled mode: pass `selectedRowIds` and `onSelectionChange` — caller owns the array.
 * Uncontrolled mode: omit `selectedRowIds`; the hook keeps its own state and still emits
 * `onSelectionChange` so consumers can react.
 *
 * Select-all toggles only the row ids passed via `toggleAll(visibleIds)` — i.e. the
 * currently visible (filtered/paged) rows. Selections from prior pages are preserved
 * unless the caller explicitly clears them.
 */
const useMultiRowSelection = ({ enabled, selectedRowIds, onSelectionChange }) => {
  const isControlled = Array.isArray(selectedRowIds) || selectedRowIds instanceof Set;
  const [internalIds, setInternalIds] = useState(() => toIdSet(selectedRowIds));

  const lastEmittedRef = useRef(internalIds);

  useEffect(() => {
    if (!isControlled) return;
    const next = toIdSet(selectedRowIds);
    setInternalIds((prev) => (setsAreEqual(prev, next) ? prev : next));
  }, [isControlled, selectedRowIds]);

  const emit = useCallback(
    (nextSet) => {
      if (typeof onSelectionChange === "function" && !setsAreEqual(lastEmittedRef.current, nextSet)) {
        lastEmittedRef.current = nextSet;
        onSelectionChange(Array.from(nextSet));
      }
    },
    [onSelectionChange]
  );

  const update = useCallback(
    (mutator) => {
      setInternalIds((prev) => {
        const next = new Set(prev);
        mutator(next);
        if (setsAreEqual(prev, next)) return prev;
        emit(next);
        return next;
      });
    },
    [emit]
  );

  const toggleRow = useCallback(
    (id) => {
      update((set) => {
        if (set.has(id)) set.delete(id);
        else set.add(id);
      });
    },
    [update]
  );

  const toggleAll = useCallback(
    (visibleIds) => {
      const ids = Array.isArray(visibleIds) ? visibleIds : [];
      update((set) => {
        const allSelected = ids.length > 0 && ids.every((id) => set.has(id));
        if (allSelected) {
          for (const id of ids) set.delete(id);
        } else {
          for (const id of ids) set.add(id);
        }
      });
    },
    [update]
  );

  const clear = useCallback(() => {
    update((set) => set.clear());
  }, [update]);

  const isSelected = useCallback((id) => internalIds.has(id), [internalIds]);

  const getSelectionState = useCallback(
    (visibleIds) => {
      const ids = Array.isArray(visibleIds) ? visibleIds : [];
      if (ids.length === 0) return { allSelected: false, someSelected: false };
      let selectedCount = 0;
      for (const id of ids) if (internalIds.has(id)) selectedCount++;
      return {
        allSelected: selectedCount === ids.length,
        someSelected: selectedCount > 0 && selectedCount < ids.length,
      };
    },
    [internalIds]
  );

  return useMemo(
    () => ({
      enabled: Boolean(enabled),
      selectedIds: internalIds,
      isSelected,
      toggleRow,
      toggleAll,
      clear,
      getSelectionState,
    }),
    [enabled, internalIds, isSelected, toggleRow, toggleAll, clear, getSelectionState]
  );
};

export { useMultiRowSelection };
