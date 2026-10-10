import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "react-toastify";
import { getApiErrorMessage } from "@utils/apiErrorMessage";

/**
 * Drives a read-only master list that is paginated + infinite-scrolled and
 * driven by the standard report filter bar (`BaseFilter` + `MasterTable`).
 * The endpoint is expected to return
 * `{ data: { [rowsKey], columns, pagination: { hasNextPage } } }`; this hook
 * owns that shared lifecycle so each master only supplies its `fetcher`.
 *
 * @param {(params:object)=>Promise} fetcher  API call, receives `{ ...filters, page, limit }`.
 * @param {object}  [opts]
 * @param {boolean} [opts.enabled=true]    Skip the initial load until true (e.g. permission gate).
 * @param {number}  [opts.pageLimit=200]   Rows per page.
 * @param {string}  [opts.rowsKey='rows']  Key under `data` that holds the row array
 *                                          (pass the endpoint's own key, e.g. 'items').
 *
 * Returns the list state plus `setRows` (for live socket prepends),
 * `applyFilters` (BaseFilter's onFiltersApply) and `loadMore` (infinite scroll).
 */
function usePaginatedMasterList(fetcher, { enabled = true, pageLimit = 200, rowsKey = "rows" } = {}) {
  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const currentPageRef = useRef(1);
  const currentFiltersRef = useRef({});

  const fetchPage = useCallback(async ({ filters, page, append }) => {
    if (append) setIsLoadingMore(true);
    else setLoading(true);

    try {
      const response = await fetcher({ ...filters, page, limit: pageLimit });
      const payload = response?.data?.data ?? {};
      const nextRows = payload[rowsKey] ?? [];
      const pagination = payload.pagination ?? null;

      if (payload.columns) setColumns(payload.columns);

      setRows((prev) => (append ? [...prev, ...nextRows] : nextRows));
      setHasMore(Boolean(pagination?.hasNextPage));
      currentPageRef.current = page;
    } catch (error) {
      toast.error(`Could not load page ${page}: ${getApiErrorMessage(error, 'the server gave no reason')}`);
      if (!append) setHasMore(false);
    } finally {
      if (append) setIsLoadingMore(false);
      else setLoading(false);
    }
  }, [fetcher, pageLimit, rowsKey]);

  useEffect(() => {
    if (enabled) fetchPage({ filters: {}, page: 1, append: false });
  }, [enabled, fetchPage]);

  const applyFilters = useCallback(
    async (appliedFilters) => {
      currentFiltersRef.current = appliedFilters;
      await fetchPage({ filters: appliedFilters, page: 1, append: false });
    },
    [fetchPage]
  );

  const loadMore = useCallback(() => {
    if (loading || isLoadingMore || !hasMore) return;
    fetchPage({
      filters: currentFiltersRef.current,
      page: currentPageRef.current + 1,
      append: true,
    });
  }, [loading, isLoadingMore, hasMore, fetchPage]);

  return { rows, setRows, columns, loading, isLoadingMore, hasMore, applyFilters, loadMore };
}

export { usePaginatedMasterList };
