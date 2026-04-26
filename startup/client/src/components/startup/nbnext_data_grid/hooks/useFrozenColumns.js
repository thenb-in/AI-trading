import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { calculateFrozenOffsets } from "../utils/helpers.js";

const useFrozenColumns = (normalizedColumns, visibleColumns, columnWidths = null, initialFrozenColumns = null) => {
  // Track if we've initialized from the prop (only once)
  const hasInitializedFromProp = useRef(false);
  
  const [frozenState, setFrozenState] = useState(() => {
    const initial = {};
    // Initialize from column definition (will be overridden by prop if provided)
    normalizedColumns.forEach((c) => {
      initial[c.field] = c.frozen === true;
    });
    return initial;
  });

  // Initialize from prop when both normalizedColumns and initialFrozenColumns are available
  // This handles the case where columns load asynchronously (like in reports)
  useEffect(() => {
    if (hasInitializedFromProp.current) return; // Only initialize once
    if (!normalizedColumns.length) return; // Wait for columns to be available
    
    // If initialFrozenColumns prop is provided, use it for initialization
    if (initialFrozenColumns && Array.isArray(initialFrozenColumns) && initialFrozenColumns.length > 0) {
      setFrozenState((prev) => {
        const updated = {};
        normalizedColumns.forEach((c) => {
          // Initialize from prop if field is in the array, otherwise from column definition or existing state
          if (prev[c.field] !== undefined) {
            // Preserve existing state if already set
            updated[c.field] = prev[c.field];
          } else {
            // Initialize from prop if field is in the array, otherwise from column definition
            updated[c.field] = initialFrozenColumns.includes(c.field) || c.frozen === true;
          }
        });
        return updated;
      });
      hasInitializedFromProp.current = true;
    } else {
      // No prop provided, mark as initialized so we don't try again
      hasInitializedFromProp.current = true;
    }
  }, [normalizedColumns, initialFrozenColumns]);

  // Handle new columns being added (but don't override user changes)
  useEffect(() => {
    if (!normalizedColumns.length) return;
    setFrozenState((prev) => {
      const updated = {};
      let changed = false;
      normalizedColumns.forEach((c) => {
        if (prev[c.field] === undefined) {
          // New column: use column definition's frozen property
          updated[c.field] = c.frozen === true;
          changed = true;
        } else {
          // Existing column: preserve current state
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

  const setFrozenStateState = useCallback((newFrozenState) => {
    setFrozenState(newFrozenState);
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
    toggleFrozen,
    setFrozenStateState,
    frozenColumns,
    nonFrozenColumns,
    cumulativeFrozenLeftOffsets,
  };
};

export { useFrozenColumns };

