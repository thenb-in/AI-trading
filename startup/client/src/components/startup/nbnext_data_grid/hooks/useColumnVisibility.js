import { useState, useEffect, useCallback } from "react";

const useColumnVisibility = (normalizedColumns, initialColumnVisibility, onColumnVisibilityChange) => {
  const [columnVisibility, setColumnVisibility] = useState(() => {
    const initial = {};
    normalizedColumns.forEach((c) => {
      const visible =
        initialColumnVisibility && initialColumnVisibility[c.field] !== undefined
          ? Boolean(initialColumnVisibility[c.field])
          : !c.hide;
      initial[c.field] = visible;
    });
    return initial;
  });

  // Reset column visibility when columns change (e.g. after filter apply)
  // Rebuild from column definitions so API hide/hidden values are respected
  useEffect(() => {
    if (!normalizedColumns.length) return;
    setColumnVisibility((prev) => {
      const updated = {};
      let changed = false;
      normalizedColumns.forEach((c) => {
        const visible =
          initialColumnVisibility && initialColumnVisibility[c.field] !== undefined
            ? Boolean(initialColumnVisibility[c.field])
            : !c.hide;
        updated[c.field] = visible;
        if (prev[c.field] !== visible) {
          changed = true;
        }
      });
      // Also consider changed if column set changed (added/removed columns)
      if (Object.keys(prev).length !== normalizedColumns.length) {
        changed = true;
      }
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
      return { ...prev, [field]: !currentlyVisible };
    });
  }, []);

  const setColumnVisibilityState = useCallback((newVisibility) => {
    setColumnVisibility(newVisibility);
  }, []);

  return {
    columnVisibility,
    toggleColumnVisibility,
    setColumnVisibilityState,
  };
};

export { useColumnVisibility };

