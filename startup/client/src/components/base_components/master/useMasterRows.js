import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { useDebouncedValue } from '@startup/hooks/useDebouncedValue';
import { getApiErrorMessage } from '@utils/apiErrorMessage';

// Long enough that a word typed at speed is one request, short enough to feel live.
const SERVER_SEARCH_DEBOUNCE_MS = 400;

/**
 * A master's rows: loading them, the next page, and the search and filters they
 * are loaded with.
 *
 * `loadRows(requestFilters)` answers the framework's shape — `{ data: { columns,
 * [rowsKey], pagination? } }` — or `extractResponse(response)` reads another one
 * into `{ rows, columns, hasMore?, summary? }`, where `summary` is what the
 * server says about the whole set (a total over every page). With
 * `infiniteScroll` each request also carries `{ page, pageSize }`, and there is more while the page is under
 * `pagination.totalPages` (or the extracted `hasMore`), otherwise until a page
 * comes back empty.
 *
 * With `serverSearch` the search box is sent as `search` (debounced) and the
 * server does the matching; otherwise the caller matches the loaded rows.
 */
const useMasterRows = ({
  title,
  canRead,
  loadRows,
  rowsKey,
  extractResponse,
  initialFilters,
  mapFiltersForApi,
  infiniteScroll,
  pageSize,
  serverSearch,
  searchQuery,
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
  const [summary, setSummary] = useState(null);
  const [filters, setFilters] = useState(initialFilters);
  const search = useDebouncedValue(serverSearch ? searchQuery : '', SERVER_SEARCH_DEBOUNCE_MS);

  const fetchRows = useCallback(async (filterOverride, { pageToLoad = 1, append = false, silent = false } = {}) => {
    if (!canRead) {
      toast.error(unauthorizedToast);
      return;
    }
    try {
      if (append) setIsLoadingMore(true); else if (!silent) setLoading(true);
      const apiFilters = filterOverride ?? filters;
      const mappedFilters = mapFiltersForApi ? mapFiltersForApi(apiFilters) : apiFilters;
      const requestFilters = {
        ...mappedFilters,
        ...(search ? { search } : {}),
        ...(infiniteScroll ? { page: pageToLoad, pageSize } : {}),
      };
      const response = await loadRows(requestFilters);
      if (extractResponse || response.data.success) {
        const extracted = extractResponse
          ? extractResponse(response)
          : {
            rows: response.data.data[rowsKey] || [],
            columns: response.data.data.columns || [],
            hasMore: response.data.data.pagination && pageToLoad < response.data.data.pagination.totalPages,
          };
        const nextRows = extracted.rows;
        setRows((prev) => (append ? [...prev, ...nextRows] : nextRows));
        setColumns(extracted.columns);
        setHasMore(extracted.hasMore ?? nextRows.length > 0);
        setSummary(extracted.summary ?? null);
        setPage(pageToLoad);
        if (fetchSuccessToast) toast.success(fetchSuccessToast);
      }
    } catch (error) {
      console.error(`${title}: Error fetching rows`, { error });
      // What failed and why, together: the screen's own wording says which list
      // would not load, and the server says what stopped it — a missing
      // permission names itself, so nobody has to open a console to find out.
      if (fetchFailureToast) {
        toast.error(`${fetchFailureToast}: ${getApiErrorMessage(error, 'the server gave no reason')}`);
      }
    } finally {
      if (append) setIsLoadingMore(false); else setLoading(false);
    }
  }, [canRead, loadRows, rowsKey, fetchSuccessToast, fetchFailureToast, unauthorizedToast, title, filters, mapFiltersForApi, extractResponse, infiniteScroll, pageSize, search]);

  const latestRef = useRef({});
  latestRef.current = { loading, isLoadingMore, hasMore, page, fetchRows };
  const isFetchingMoreRef = useRef(false);

  const loadMore = useCallback(() => {
    const state = latestRef.current;
    if (isFetchingMoreRef.current) return;
    if (state.loading || state.isLoadingMore || !state.hasMore) return;
    isFetchingMoreRef.current = true;
    Promise.resolve(state.fetchRows(undefined, { pageToLoad: state.page + 1, append: true }))
      .finally(() => { isFetchingMoreRef.current = false; });
  }, []);

  // First load, and again whenever the server-side search changes.
  useEffect(() => {
    latestRef.current.fetchRows();
  }, [search]);

  // Filters picked in the filter bar are kept, so paging and refresh load with them too.
  const applyFilters = useCallback((applied) => {
    setFilters(applied);
    latestRef.current.fetchRows(applied);
  }, []);

  /** Refetch quietly, keeping the grid where it is — for rows that changed elsewhere. */
  const reloadQuietly = useCallback(() => latestRef.current.fetchRows(undefined, { silent: true }), []);

  /** Swap one row for the record the server handed back, instead of reloading the list. */
  const patchRow = useCallback((saved) => {
    setRows((prev) => prev.map((row) => (row.id === saved.id ? { ...row, ...saved } : row)));
  }, []);

  return { rows, setRows, columns, summary, loading, isLoadingMore, hasMore, filters, fetchRows, loadMore, applyFilters, reloadQuietly, patchRow };
};

export { useMasterRows };
