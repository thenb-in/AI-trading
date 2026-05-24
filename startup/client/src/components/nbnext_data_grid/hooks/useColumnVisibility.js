import { useState, useEffect, useCallback, useRef } from "react";

// Returns both `columnVisibility` (the effective state shown in the grid) and
// `originalColumnVisibility` (the user-intended baseline — set on layout load
// and on every manual toggle). Saving a layout persists the baseline snapshot.
//
// Existing fields are sticky: once a value comes from a layout or a manual
// toggle, the column-def `hide` flag never re-overrides it. The effect only
// (a) adds newly-introduced columns with their c.hide default, and (b) drops
// columns the backend no longer ships. Previously this effect also re-applied
// c.hide as a "backend overlay", but that silently reverted layout-loaded or
// user-toggled values whenever columnsToUse recomputed (e.g. when rows
// arrived and useConstantColumns ran).
const useColumnVisibility = (normalizedColumns, initialColumnVisibility, onColumnVisibilityChange) => {
  const buildInitialFor = (c) =>
    initialColumnVisibility && initialColumnVisibility[c.field] !== undefined
      ? Boolean(initialColumnVisibility[c.field])
      : !c.hide;

  const buildInitial = () => {
    const initial = {};
    normalizedColumns.forEach((c) => {
      initial[c.field] = buildInitialFor(c);
    });
    return initial;
  };

  const [columnVisibility, setColumnVisibility] = useState(buildInitial);
  const [originalColumnVisibility, setOriginalColumnVisibility] = useState(buildInitial);
  // Mirror of original — kept current via setter wrappers so consumers can
  // read the latest baseline synchronously without waiting for the next render.
  const originalRef = useRef(originalColumnVisibility);

  useEffect(() => {
    if (!normalizedColumns.length) return;

    const cDefaults = {};
    normalizedColumns.forEach((c) => {
      cDefaults[c.field] = buildInitialFor(c);
    });

    setOriginalColumnVisibility((prev) => {
      const updated = { ...prev };
      let changed = false;
      normalizedColumns.forEach((c) => {
        if (prev[c.field] === undefined) {
          updated[c.field] = cDefaults[c.field];
          changed = true;
        }
      });
      Object.keys(prev).forEach((f) => {
        if (!(f in cDefaults)) {
          delete updated[f];
          changed = true;
        }
      });
      if (!changed) return prev;
      originalRef.current = updated;
      return updated;
    });

    setColumnVisibility((prev) => {
      const updated = { ...prev };
      let changed = false;
      normalizedColumns.forEach((c) => {
        if (prev[c.field] === undefined) {
          updated[c.field] = cDefaults[c.field];
          changed = true;
        }
      });
      Object.keys(prev).forEach((f) => {
        if (!(f in cDefaults)) {
          delete updated[f];
          changed = true;
        }
      });
      return changed ? updated : prev;
    });
  }, [normalizedColumns, initialColumnVisibility]);

  useEffect(() => {
    if (onColumnVisibilityChange) {
      onColumnVisibilityChange(columnVisibility);
    }
  }, [columnVisibility, onColumnVisibilityChange]);

  const toggleColumnVisibility = useCallback((field) => {
    setColumnVisibility((prev) => {
      const currentlyVisible = !!prev[field];
      const numVisible = Object.values(prev).filter(Boolean).length;
      if (currentlyVisible && numVisible <= 1) {
        return prev;
      }
      const newValue = !currentlyVisible;
      setOriginalColumnVisibility((origPrev) => {
        const next = { ...origPrev, [field]: newValue };
        originalRef.current = next;
        return next;
      });
      return { ...prev, [field]: newValue };
    });
  }, []);

  const setColumnVisibilityState = useCallback((newVisibility) => {
    setColumnVisibility(newVisibility);
  }, []);

  const setOriginalColumnVisibilityState = useCallback((newOriginal) => {
    setOriginalColumnVisibility(newOriginal);
    originalRef.current = newOriginal;
  }, []);

  return {
    columnVisibility,
    originalColumnVisibility,
    toggleColumnVisibility,
    setColumnVisibilityState,
    setOriginalColumnVisibilityState,
  };
};

export { useColumnVisibility };
