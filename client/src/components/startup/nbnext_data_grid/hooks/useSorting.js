import { useState, useEffect, useCallback } from "react";
import { SORT_DIRECTIONS } from "../utils/constants.js";

const useSorting = (initialSortModel, onSortModelChange) => {
  const [sortModel, setSortModel] = useState(() => {
    if (initialSortModel && initialSortModel.field && initialSortModel.sort) {
      return { field: initialSortModel.field, sort: initialSortModel.sort };
    }
    return { field: SORT_DIRECTIONS.NONE, sort: SORT_DIRECTIONS.NONE };
  });

  useEffect(() => {
    if (onSortModelChange) {
      onSortModelChange(sortModel);
    }
  }, [sortModel, onSortModelChange]);

  const handleHeaderClick = useCallback((col) => {
    if (!col.sortable) return;
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

  return {
    sortModel,
    handleHeaderClick,
  };
};

export { useSorting };

