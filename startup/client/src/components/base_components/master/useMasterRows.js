import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-toastify';

/**
 * BaseMaster's rows: the first load, filter reloads, server paging and the
 * in-place reload every action ends with.
 *
 * `fetchRows(filterOverride, { pageToLoad, append, silent })` loads a page;
 * `refresh()` reloads the current filters silently — the rows change in place,
 * with no "Loading..." remount, so the grid keeps its scroll, sort and grouping.
 * `subscribeToRefresh` (see BaseMaster) is wired to `refresh`.
 */
const useMasterRows = ({
  title,
  canRead,
  loadRows,
  rowsKey,
  extractResponse,
  filters,
  mapFiltersForApi,
  infiniteScroll,
  pageSize,
  subscribeToRefresh,
  unauthorizedToast,
  fetchSuccessToast,
  fetchFailureToast,
}) => {
  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const fetchRows = useCallback(async (filterOverride, { pageToLoad = 1, append = false, silent = false } = {}) => {
    if (!canRead) {
      toast.error(unauthorizedToast);
      return;
    }
    try {
      if (append) setIsLoadingMore(true); else if (!silent) setLoading(true);
      const apiFilters = filterOverride ?? filters;
      const mappedFilters = mapFiltersForApi ? mapFiltersForApi(apiFilters) : apiFilters;
      const requestFilters = infiniteScroll
        ? { ...mappedFilters, page: pageToLoad, pageSize }
        : mappedFilters;
      const response = await loadRows(requestFilters);
      if (extractResponse || response.data.success) {
        const extracted = extractResponse
          ? extractResponse(response)
          : {
            rows: response.data.data[rowsKey] || [],
            columns: response.data.data.columns || [],
          };
        const nextRows = extracted.rows;
        setRows((prev) => (append ? [...prev, ...nextRows] : nextRows));
        setColumns(extracted.columns);
        setHasMore(nextRows.length > 0);
        setPage(pageToLoad);
        if (fetchSuccessToast) toast.success(fetchSuccessToast);
      }
    } catch (error) {
      console.error(`${title}: Error fetching rows`, { error });
      if (fetchFailureToast) toast.error(fetchFailureToast);
    } finally {
      if (append) setIsLoadingMore(false); else setLoading(false);
    }
  }, [canRead, loadRows, rowsKey, fetchSuccessToast, fetchFailureToast, unauthorizedToast, title, filters, mapFiltersForApi, extractResponse, infiniteScroll, pageSize]);

  const refresh = useCallback(() => fetchRows(undefined, { silent: true }), [fetchRows]);

  const loadMoreRef = useRef({});
  loadMoreRef.current = { loading, isLoadingMore, hasMore, page, fetchRows, refresh };
  const isFetchingMoreRef = useRef(false);

  const handleLoadMore = useCallback(() => {
    const state = loadMoreRef.current;
    if (isFetchingMoreRef.current) return;
    if (state.loading || state.isLoadingMore || !state.hasMore) return;
    isFetchingMoreRef.current = true;
    Promise.resolve(state.fetchRows(undefined, { pageToLoad: state.page + 1, append: true }))
      .finally(() => { isFetchingMoreRef.current = false; });
  }, []);

  useEffect(() => {
    fetchRows();
  }, []);

  useEffect(
    () => subscribeToRefresh?.(() => loadMoreRef.current.refresh()),
    [subscribeToRefresh],
  );

  return { rows, setRows, columns, loading, isLoadingMore, hasMore, fetchRows, refresh, handleLoadMore };
};

export { useMasterRows };
