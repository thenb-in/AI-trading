import { useState, useEffect, useCallback, useRef } from "react";
import { SORT_DIRECTIONS } from "../utils/constants";

// Defensive copy + drop entries missing `field` or `sort`. Input must already
// be the canonical array shape `[{ field, sort }, ...]`.
const normalizeIncomingSortModel = (model) => {
  if (!Array.isArray(model)) return [];
  return model
    .filter((s) => s && s.field && s.sort)
    .map((s) => ({ field: s.field, sort: s.sort }));
};

const sortModelKey = (arr) => arr.map((s) => `${s.field}:${s.sort}`).join("|");

const useSorting = (initialSortModel, onSortModelChange) => {
  const [sortModel, setSortModel] = useState(() =>
    normalizeIncomingSortModel(initialSortModel)
  );

  // Track if sort has been manually changed by user
  const hasManualSortRef = useRef(false);
  const prevInitialKeyRef = useRef(
    sortModelKey(normalizeIncomingSortModel(initialSortModel))
  );
  const sortModelRef = useRef(sortModel);

  useEffect(() => {
    sortModelRef.current = sortModel;
  }, [sortModel]);

  // Apply initial sort model when it changes (e.g., when columns/data load).
  // Only apply if the user hasn't manually changed the sort yet.
  useEffect(() => {
    const next = normalizeIncomingSortModel(initialSortModel);
    const nextKey = sortModelKey(next);
    if (nextKey === prevInitialKeyRef.current) return;
    prevInitialKeyRef.current = nextKey;

    if (hasManualSortRef.current) return;
    if (next.length === 0) return;

    const currentKey = sortModelKey(sortModelRef.current);
    if (currentKey === "" || currentKey !== nextKey) {
      setSortModel(next);
    }
  }, [initialSortModel]);

  useEffect(() => {
    if (onSortModelChange) {
      onSortModelChange(sortModel);
    }
  }, [sortModel, onSortModelChange]);

  // Click cycle for multi-level sort:
  //   not present → append as next priority level (asc)
  //   present asc → flip to desc, keep priority
  //   present desc → remove (other entries shift up to fill the gap)
  const handleHeaderClick = useCallback((col) => {
    if (!col.sortable) return;
    hasManualSortRef.current = true;
    setSortModel((prev) => {
      const idx = prev.findIndex((s) => s.field === col.field);
      if (idx === -1) {
        return [...prev, { field: col.field, sort: SORT_DIRECTIONS.ASC }];
      }
      const current = prev[idx];
      if (current.sort === SORT_DIRECTIONS.ASC) {
        const copy = [...prev];
        copy[idx] = { field: col.field, sort: SORT_DIRECTIONS.DESC };
        return copy;
      }
      return prev.filter((_, i) => i !== idx);
    });
  }, []);

  // Move `field` to position 0 of the sort stack so it becomes the primary
  // key. If already present, preserves its existing direction; otherwise it's
  // inserted as ascending. Other entries keep their relative order. Used by
  // grouping, which only needs the grouped column to be primary — secondary
  // keys still apply within each group.
  const promoteToPrimarySort = useCallback((field) => {
    if (!field) return;
    setSortModel((prev) => {
      if (prev[0]?.field === field) return prev;
      const existing = prev.find((s) => s.field === field);
      const promoted = existing || { field, sort: SORT_DIRECTIONS.ASC };
      return [promoted, ...prev.filter((s) => s.field !== field)];
    });
  }, []);

  const applyLayoutSortModel = useCallback((newSortModel) => {
    const normalized = normalizeIncomingSortModel(newSortModel);
    hasManualSortRef.current = false;
    setSortModel(normalized);
  }, []);

  return {
    sortModel,
    handleHeaderClick,
    promoteToPrimarySort,
    applyLayoutSortModel,
  };
};

export { useSorting };
