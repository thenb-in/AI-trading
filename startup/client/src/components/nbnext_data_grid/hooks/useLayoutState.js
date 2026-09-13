// Owns the 3-layer layout state (L1 = backend, L2 = saved layout, L3 = manual)
// and exposes the merged render state plus write APIs that touch only L3.
//
// Replaces the split hooks: useColumnVisibility, useFrozenColumns,
// useColumnOrder, useColumnWidths, useSorting, useFiltering — those concerns
// all collapse to selectors over `merged` + L3 writes.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isFilterEntryActive, normalizeFilterEntry } from "../utils/columnFilters";

import { SORT_DIRECTIONS } from "../utils/constants.js";
import {
  collapseLayout,
  isL3Empty,
  layoutsEqual,
  makeEmptyL3,
  mergeLayout,
} from "../utils/layoutMerge.js";
import { normalizeColumns } from "../utils/helpers.js";

const writeOverride = (l3, field, key, value) => {
  const prevEntry = l3.byField[field] || {};
  const next = { ...l3.byField };
  if (value === undefined) {
    const { [key]: _drop, ...rest } = prevEntry;
    void _drop;
    if (Object.keys(rest).length === 0) {
      delete next[field];
    } else {
      next[field] = rest;
    }
  } else {
    next[field] = { ...prevEntry, [key]: value };
  }
  return { ...l3, byField: next };
};

const useLayoutState = ({
  columnsProp,
  initialSortModel = [],
  initialFrozenColumns = null,
}) => {
  // L1 — pristine, derived from props. Re-runs of the report swap this in.
  const l1 = useMemo(() => normalizeColumns(columnsProp), [columnsProp]);

  // L1 carries the server-default `frozen` flag from column defs. The
  // `frozenColumns` prop on the grid is a per-instance default the caller
  // applies on top — collapse it into L1 once at mount so freeze logic only
  // ever consults L1 for defaults. (Caller-supplied frozen still loses to L2
  // and L3 overrides, which is what we want.)
  const l1WithFrozenProp = useMemo(() => {
    if (!Array.isArray(initialFrozenColumns) || initialFrozenColumns.length === 0) {
      return l1;
    }
    const frozenSet = new Set(initialFrozenColumns);
    return l1.map((c) => (frozenSet.has(c.field) ? { ...c, frozen: true } : c));
  }, [l1, initialFrozenColumns]);

  // L2 — saved layout (or null). `loadedLayoutId` lets the active-layout
  // indicator stay coherent across saves/refreshes without re-comparing JSON.
  const [l2, setL2] = useState(null);
  const [loadedLayoutId, setLoadedLayoutId] = useState(null);

  // L3 — manual overrides, in-memory only. Entries for fields not currently in
  // L1 stay in state (they reactivate if/when the field returns).
  const [l3, setL3] = useState(makeEmptyL3);

  // Read latest L1 in setters without putting it in setter deps.
  const l1Ref = useRef(l1WithFrozenProp);
  useEffect(() => {
    l1Ref.current = l1WithFrozenProp;
  }, [l1WithFrozenProp]);

  // initialSortModel from props is the L1-level fallback when neither L2 nor
  // L3 assert a sort. We freeze it as a snapshot so identity churn from a new
  // array literal upstream doesn't trigger the merge.
  const fallbackSortRef = useRef(initialSortModel);
  useEffect(() => {
    fallbackSortRef.current = initialSortModel;
  }, [initialSortModel]);

  const merged = useMemo(
    () => mergeLayout(l1WithFrozenProp, l2, l3, initialSortModel),
    [l1WithFrozenProp, l2, l3, initialSortModel]
  );

  // ─── Visibility ─────────────────────────────────────────────────────────
  const toggleColumnVisibility = useCallback((field) => {
    setL3((prev) => {
      const l1Cur = l1Ref.current;
      const col = l1Cur.find((c) => c.field === field);
      if (!col) return prev;
      // Block hiding the last visible column — mirrors the legacy guard.
      const currentMerge = mergeLayout(l1Cur, l2, prev, fallbackSortRef.current);
      const currentlyVisible = currentMerge.columnVisibility[field] === true;
      if (currentlyVisible) {
        const visibleCount = Object.values(currentMerge.columnVisibility).filter(Boolean).length;
        if (visibleCount <= 1) return prev;
      }
      const newHide = currentlyVisible;
      return writeOverride(prev, field, "hide", newHide);
    });
  }, [l2]);

  // ─── Frozen ─────────────────────────────────────────────────────────────
  const toggleFrozen = useCallback((field) => {
    setL3((prev) => {
      const currentMerge = mergeLayout(l1Ref.current, l2, prev, fallbackSortRef.current);
      const newFrozen = !currentMerge.frozenState[field];
      return writeOverride(prev, field, "frozen", newFrozen);
    });
  }, [l2]);

  // ─── Widths ─────────────────────────────────────────────────────────────
  const setColumnWidth = useCallback((field, width) => {
    if (!Number.isFinite(width)) return;
    setL3((prev) => writeOverride(prev, field, "width", width));
  }, []);

  // ─── Order ──────────────────────────────────────────────────────────────
  const reorderColumns = useCallback((dragField, targetField) => {
    setL3((prev) => {
      const currentMerge = mergeLayout(l1Ref.current, l2, prev, fallbackSortRef.current);
      const order = currentMerge.columnOrder.slice();
      const dragIdx = order.indexOf(dragField);
      const targetIdx = order.indexOf(targetField);
      if (dragIdx === -1 || targetIdx === -1 || dragIdx === targetIdx) return prev;
      order.splice(dragIdx, 1);
      order.splice(targetIdx, 0, dragField);
      return { ...prev, order };
    });
  }, [l2]);

  // ─── Sort ───────────────────────────────────────────────────────────────

  const handleHeaderClick = useCallback((col, event) => {
    if (!col?.sortable) return;
    const multiSort = Boolean(event?.shiftKey);
    setL3((prev) => {
      const currentMerge = mergeLayout(l1Ref.current, l2, prev, fallbackSortRef.current);
      const current = prev.sortModel ?? currentMerge.sortModel;
      const idx = current.findIndex((s) => s.field === col.field);
      let next;

      if (!multiSort) {
        // Single-column sort: cycle asc → desc → none for this column only.
        const isSoleSort = current.length === 1 && idx === 0;
        if (!isSoleSort) {
          next = [{ field: col.field, sort: SORT_DIRECTIONS.ASC }];
        } else if (current[0].sort === SORT_DIRECTIONS.ASC) {
          next = [{ field: col.field, sort: SORT_DIRECTIONS.DESC }];
        } else {
          next = [];
        }
        return { ...prev, sortModel: next };
      }

      if (idx === -1) {
        next = [...current, { field: col.field, sort: SORT_DIRECTIONS.ASC }];
      } else if (current[idx].sort === SORT_DIRECTIONS.ASC) {
        next = current.map((s, i) =>
          i === idx ? { field: s.field, sort: SORT_DIRECTIONS.DESC } : s
        );
      } else {
        next = current.filter((_, i) => i !== idx);
      }
      return { ...prev, sortModel: next };
    });
  }, [l2]);

  // Used by row-grouping to promote the grouped field to primary sort.
  const promoteToPrimarySort = useCallback((field) => {
    if (!field) return;
    setL3((prev) => {
      const currentMerge = mergeLayout(l1Ref.current, l2, prev, fallbackSortRef.current);
      const current = prev.sortModel ?? currentMerge.sortModel;
      if (current[0]?.field === field) return prev;
      const existing = current.find((s) => s.field === field);
      const promoted = existing || { field, sort: SORT_DIRECTIONS.ASC };
      return {
        ...prev,
        sortModel: [promoted, ...current.filter((s) => s.field !== field)],
      };
    });
  }, []);

  // ─── Filter ─────────────────────────────────────────────────────────────
  const setFilterValue = useCallback((field, value) => {
    setL3((prev) => {
      const currentMerge = mergeLayout(l1Ref.current, l2, prev, fallbackSortRef.current);
      const base = prev.filterModel ?? currentMerge.filterModel ?? {};
      const next = { ...base };
      // An entry that narrows nothing is dropped rather than stored: emptying
      // the box should leave no trace in the model or in a saved layout.
      if (!isFilterEntryActive(value)) {
        delete next[field];
      } else {
        next[field] = normalizeFilterEntry(value);
      }
      return { ...prev, filterModel: next };
    });
  }, [l2]);

  const clearAllFilters = useCallback(() => {
    setL3((prev) => ({ ...prev, filterModel: {} }));
  }, []);

  // ─── Layout API ─────────────────────────────────────────────────────────
  // Apply a saved layout. Replaces L2, clears L3 (the L3 delta was on top of
  // a different L2 — discarding is the documented behaviour).
  const applyLayout = useCallback((layoutConfig, meta = null) => {
    setL2(layoutConfig);
    setL3(makeEmptyL3());
    setLoadedLayoutId(meta?.id ?? null);
  }, []);

  // Unload the current layout: revert to pure L1 + (existing) L3.
  // Today this is unused; kept as a hook seam for a future "clear layout"
  // affordance the user opted out of for now.
  const clearLayout = useCallback(() => {
    setL2(null);
    setLoadedLayoutId(null);
  }, []);

  const dirty = useMemo(() => !isL3Empty(l3), [l3]);

  // Active layout: same as loaded, unless caller explicitly overrides via
  // layoutsEqual against another candidate. Two layouts could share the same
  // config — `loadedLayoutId` is the source of truth.
  const isLayoutActive = useCallback((layout) => {
    if (!layout) return false;
    if (loadedLayoutId != null) return layout.id === loadedLayoutId;
    return false;
  }, [loadedLayoutId]);

  // Build the save payload: collapse L2 + L3, optionally include filterModel.
  // The l1Snapshot captures the current L1 for audit (`l1Snapshot` field on
  // the saved config).
  const buildSavePayload = useCallback(({ includeFilters = false } = {}) => {
    const newL2 = collapseLayout(l2, l3, { includeFilters });
    return { l2: newL2, l1Snapshot: l1Ref.current };
  }, [l2, l3]);

  // Apply the post-save L2 in-place, dropping L3. Mirrors what applyLayout
  // does, but uses an already-built L2 and a known layoutId.
  const applySavedSnapshot = useCallback((newL2, layoutId) => {
    setL2(newL2);
    setL3(makeEmptyL3());
    if (layoutId != null) setLoadedLayoutId(layoutId);
  }, []);

  return {
    // Pristine L1 columns (callers needing the raw set, e.g. ColumnMenu).
    l1: l1WithFrozenProp,
    // The L2 layout currently applied (or null). Used by save/active checks.
    l2,
    // Whether L3 has unsaved changes.
    dirty,
    loadedLayoutId,
    // Merged render state — what the grid actually draws.
    merged,
    // Cell-level setters: each writes to L3 only.
    toggleColumnVisibility,
    toggleFrozen,
    setColumnWidth,
    reorderColumns,
    handleHeaderClick,
    promoteToPrimarySort,
    setFilterValue,
    clearAllFilters,
    // Layout APIs.
    applyLayout,
    clearLayout,
    isLayoutActive,
    buildSavePayload,
    applySavedSnapshot,
    // Equality helper exported for consumers that need to compare two L2s
    // (e.g. legacy layouts that load → check if anything is active).
    _layoutsEqual: layoutsEqual,
  };
};

export { useLayoutState };
