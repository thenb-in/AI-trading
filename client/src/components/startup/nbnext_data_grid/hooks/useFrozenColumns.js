import { useState, useEffect, useCallback, useMemo } from "react";
import { calculateFrozenOffsets } from "../utils/helpers.js";

const useFrozenColumns = (normalizedColumns, visibleColumns) => {
  const [frozenState, setFrozenState] = useState(() => {
    const initial = {};
    normalizedColumns.forEach((c) => {
      initial[c.field] = c.frozen === true;
    });
    return initial;
  });

  useEffect(() => {
    if (!normalizedColumns.length) return;
    setFrozenState((prev) => {
      const updated = {};
      let changed = false;
      normalizedColumns.forEach((c) => {
        if (prev[c.field] === undefined) {
          updated[c.field] = c.frozen === true;
          changed = true;
        } else {
          updated[c.field] = prev[c.field];
        }
      });
      return changed ? updated : prev;
    });
  }, [normalizedColumns]);

  const toggleFrozen = useCallback((field) => {
    setFrozenState((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  }, []);

  const frozenColumns = useMemo(() => {
    return visibleColumns.filter((c) => frozenState[c.field]);
  }, [visibleColumns, frozenState]);

  const nonFrozenColumns = useMemo(() => {
    return visibleColumns.filter((c) => !frozenState[c.field]);
  }, [visibleColumns, frozenState]);

  const cumulativeFrozenLeftOffsets = useMemo(() => {
    return calculateFrozenOffsets(frozenColumns);
  }, [frozenColumns]);

  return {
    frozenState,
    toggleFrozen,
    frozenColumns,
    nonFrozenColumns,
    cumulativeFrozenLeftOffsets,
  };
};

export { useFrozenColumns };

