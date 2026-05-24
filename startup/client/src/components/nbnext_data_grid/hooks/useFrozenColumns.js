import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { calculateFrozenOffsets } from "../utils/helpers";

// Returns both `frozenState` (the effective state used to render) and
// `originalFrozenState` (the user-intended baseline — set on layout load and
// on every manual toggle, but NOT touched by programmatic re-syncs from new
// column-definition `frozen` flags). Saving a layout persists the original
// snapshot so runtime backend overlays (e.g. unfreezing a column for a
// particular report run) don't leak into the stored layout.
const useFrozenColumns = (normalizedColumns, visibleColumns, columnWidths = null, initialFrozenColumns = null) => {
  const hasInitializedFromProp = useRef(false);

  const [frozenState, setFrozenState] = useState(() => {
    const initial = {};
    normalizedColumns.forEach((c) => {
      initial[c.field] = c.frozen === true;
    });
    return initial;
  });
  const [originalFrozenState, setOriginalFrozenState] = useState(() => {
    const initial = {};
    normalizedColumns.forEach((c) => {
      initial[c.field] = c.frozen === true;
    });
    return initial;
  });
  // Read by the column-change effect without making originalFrozenState a dep
  // (which would re-fire the overlay immediately after a manual toggle and
  // revert it).
  const originalRef = useRef(originalFrozenState);

  // Initialize from initialFrozenColumns prop once (handles async column load)
  useEffect(() => {
    if (hasInitializedFromProp.current) return;
    if (!normalizedColumns.length) return;

    if (initialFrozenColumns && Array.isArray(initialFrozenColumns) && initialFrozenColumns.length > 0) {
      const propBased = {};
      normalizedColumns.forEach((c) => {
        propBased[c.field] = initialFrozenColumns.includes(c.field) || c.frozen === true;
      });
      setFrozenState((prev) => {
        const updated = {};
        normalizedColumns.forEach((c) => {
          updated[c.field] = prev[c.field] !== undefined ? prev[c.field] : propBased[c.field];
        });
        return updated;
      });
      setOriginalFrozenState((prev) => {
        const updated = {};
        normalizedColumns.forEach((c) => {
          updated[c.field] = prev[c.field] !== undefined ? prev[c.field] : propBased[c.field];
        });
        originalRef.current = updated;
        return updated;
      });
      hasInitializedFromProp.current = true;
    } else {
      hasInitializedFromProp.current = true;
    }
  }, [normalizedColumns, initialFrozenColumns]);

  // On column-set changes: add newly-introduced columns with their c.frozen
  // default, and drop columns the backend no longer ships. Existing fields
  // are sticky — layout/user choices aren't overridden by the column-def flag.
  useEffect(() => {
    if (!normalizedColumns.length) return;

    setOriginalFrozenState((prev) => {
      const updated = { ...prev };
      let changed = false;
      normalizedColumns.forEach((c) => {
        if (prev[c.field] === undefined) {
          updated[c.field] = c.frozen === true;
          changed = true;
        }
      });
      Object.keys(prev).forEach((f) => {
        if (!normalizedColumns.find((c) => c.field === f)) {
          delete updated[f];
          changed = true;
        }
      });
      if (!changed) return prev;
      originalRef.current = updated;
      return updated;
    });

    setFrozenState((prev) => {
      const updated = { ...prev };
      let changed = false;
      normalizedColumns.forEach((c) => {
        if (prev[c.field] === undefined) {
          updated[c.field] = c.frozen === true;
          changed = true;
        }
      });
      Object.keys(prev).forEach((f) => {
        if (!normalizedColumns.find((c) => c.field === f)) {
          delete updated[f];
          changed = true;
        }
      });
      return changed ? updated : prev;
    });
  }, [normalizedColumns]);

  const toggleFrozen = useCallback((field) => {
    setFrozenState((prev) => {
      const newValue = !prev[field];
      setOriginalFrozenState((origPrev) => {
        const next = { ...origPrev, [field]: newValue };
        originalRef.current = next;
        return next;
      });
      return { ...prev, [field]: newValue };
    });
  }, []);

  const setFrozenStateState = useCallback((newFrozenState) => {
    setFrozenState(newFrozenState);
  }, []);

  const setOriginalFrozenStateState = useCallback((newOriginal) => {
    setOriginalFrozenState(newOriginal);
    originalRef.current = newOriginal;
  }, []);

  const frozenColumns = useMemo(() => {
    return visibleColumns.filter((c) => frozenState[c.field]);
  }, [visibleColumns, frozenState]);

  const nonFrozenColumns = useMemo(() => {
    return visibleColumns.filter((c) => !frozenState[c.field]);
  }, [visibleColumns, frozenState]);

  const cumulativeFrozenLeftOffsets = useMemo(() => {
    return calculateFrozenOffsets(frozenColumns, columnWidths);
  }, [frozenColumns, columnWidths]);

  return {
    frozenState,
    originalFrozenState,
    toggleFrozen,
    setFrozenStateState,
    setOriginalFrozenStateState,
    frozenColumns,
    nonFrozenColumns,
    cumulativeFrozenLeftOffsets,
  };
};

export { useFrozenColumns };
