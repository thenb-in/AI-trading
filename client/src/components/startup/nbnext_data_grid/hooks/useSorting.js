import { useState, useEffect, useCallback, useRef } from "react";
import { SORT_DIRECTIONS } from "../utils/constants.js";

const useSorting = (initialSortModel, onSortModelChange) => {
  const [sortModel, setSortModel] = useState(() => {
    if (initialSortModel && initialSortModel.field && initialSortModel.sort) {
      return { field: initialSortModel.field, sort: initialSortModel.sort };
    }
    return { field: SORT_DIRECTIONS.NONE, sort: SORT_DIRECTIONS.NONE };
  });

  // Track if sort has been manually changed by user
  const hasManualSortRef = useRef(false);
  const prevInitialSortModelRef = useRef(initialSortModel);
  const sortModelRef = useRef(sortModel);

  // Keep ref in sync with sortModel state
  useEffect(() => {
    sortModelRef.current = sortModel;
  }, [sortModel]);

  // Apply initial sort model when it changes (e.g., when columns/data load)
  // Only apply if user hasn't manually changed the sort yet
  useEffect(() => {
    const prevInitial = prevInitialSortModelRef.current;
    const hasChanged = 
      prevInitial?.field !== initialSortModel?.field || 
      prevInitial?.sort !== initialSortModel?.sort;

    if (hasChanged) {
      prevInitialSortModelRef.current = initialSortModel;
      
      // Only apply if user hasn't manually changed sort and initialSortModel is valid
      if (!hasManualSortRef.current && initialSortModel && initialSortModel.field && initialSortModel.sort) {
        // Check if current sort is in default state (no sort) - if so, always apply initial sort
        const currentSort = sortModelRef.current;
        const isDefaultSort = !currentSort.field || currentSort.field === SORT_DIRECTIONS.NONE || 
                             !currentSort.sort || currentSort.sort === SORT_DIRECTIONS.NONE;
        
        if (isDefaultSort || (currentSort.field !== initialSortModel.field || currentSort.sort !== initialSortModel.sort)) {
          setSortModel({ field: initialSortModel.field, sort: initialSortModel.sort });
        }
      }
    }
  }, [initialSortModel]);

  useEffect(() => {
    if (onSortModelChange) {
      onSortModelChange(sortModel);
    }
  }, [sortModel, onSortModelChange]);

  const handleHeaderClick = useCallback((col) => {
    if (!col.sortable) return;
    hasManualSortRef.current = true; // Mark that user has manually changed sort
    setSortModel((prev) => {
      if (prev.field !== col.field) {
        return { field: col.field, sort: SORT_DIRECTIONS.ASC };
      }
      if (prev.sort === SORT_DIRECTIONS.ASC) {
        return { field: col.field, sort: SORT_DIRECTIONS.DESC };
      }
      if (prev.sort === SORT_DIRECTIONS.DESC) {
        return { field: SORT_DIRECTIONS.NONE, sort: SORT_DIRECTIONS.NONE };
      }
      return { field: col.field, sort: SORT_DIRECTIONS.ASC };
    });
  }, []);

  // Programmatic sort setter (does not mark as "manual" sort)
  const setSortModelProgrammatic = useCallback((nextSortModel) => {
    if (!nextSortModel || !nextSortModel.field || !nextSortModel.sort) return;
    setSortModel({ field: nextSortModel.field, sort: nextSortModel.sort });
  }, []);

  return {
    sortModel,
    handleHeaderClick,
    setSortModelProgrammatic,
  };
};

export { useSorting };

