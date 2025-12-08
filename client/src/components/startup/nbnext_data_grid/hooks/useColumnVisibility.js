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

  useEffect(() => {
    if (!normalizedColumns.length) return;
    setColumnVisibility((prev) => {
      const updated = { ...prev };
      let changed = false;
      normalizedColumns.forEach((c) => {
        if (updated[c.field] === undefined) {
          updated[c.field] = !c.hide;
          changed = true;
        }
      });
      return changed ? updated : prev;
    });
  }, [normalizedColumns]);

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

