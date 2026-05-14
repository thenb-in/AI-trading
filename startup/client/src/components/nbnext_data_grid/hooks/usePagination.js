import { useState, useEffect, useMemo } from "react";
import { MAX_CELL_THRESHOLD } from "../utils/constants";

const usePagination = (sortedRows, visibleColumnCount, fullScreen = false) => {
  const autoPageSize = Math.max(1, Math.floor(MAX_CELL_THRESHOLD / (visibleColumnCount || 1)));

  const [page, setPage] = useState(0);

  const totalPages = useMemo(() => {
    if (fullScreen) return 1; // No pagination in fullscreen
    const totalRows = sortedRows.length;
    return Math.max(1, Math.ceil(totalRows / autoPageSize));
  }, [sortedRows, autoPageSize, fullScreen]);

  useEffect(() => {
    if (!fullScreen) {
      setPage((p) => (p > totalPages - 1 ? totalPages - 1 : p));
    }
  }, [totalPages, fullScreen]);

  const pagedRows = useMemo(() => {
    if (fullScreen) {
      return sortedRows; // Return all rows in fullscreen mode
    }
    const start = page * autoPageSize;
    const end = start + autoPageSize;
    return sortedRows.slice(start, end);
  }, [sortedRows, page, autoPageSize, fullScreen]);

  const goToNextPage = () => {
    setPage((p) => Math.min(totalPages - 1, p + 1));
  };

  const goToPrevPage = () => {
    setPage((p) => Math.max(0, p - 1));
  };

  return {
    page,
    totalPages,
    autoPageSize,
    pagedRows,
    goToNextPage,
    goToPrevPage,
  };
};

export { usePagination };

