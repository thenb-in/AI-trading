import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CACHE_NS_FILTER_OPTIONS } from '@startup/constants/cache';
import { subscribeToCacheBust } from '@services/cacheManager';

/**
 * Generic dynamic filter-options hook — lazy.
 *
 * Reads a filters config array, collects entries marked `dynamic: true`, and
 * resolves their options via the caller-supplied `loaders` registry. App-side
 * code owns the loaders (what to fetch, how to build options); this hook only
 * decides *when* to fetch.
 *
 * Nothing is fetched on mount. A list loads the first time its dropdown is
 * opened (or immediately, if that filter arrived with a non-default value that
 * needs labels — see FilterField). So a report page no longer pays for the full
 * employee roster, the department tree, cost centres, positions and users just
 * to render; a list the user never opens costs nothing at all.
 *
 * Until a list loads, the dropdown shows `build([])` — the placeholder options,
 * in practice just the "All X" entry — so a filter sitting on its default still
 * reads "All Employees" rather than an empty box.
 *
 * Loaders cache under the `filterOptions` namespace (see `cacheManager`), so
 * the second report page a user opens reuses the first one's roster instead of
 * asking the server again. Busting that namespace — the refresh button in the
 * filter panel — refetches everything already loaded, and only that: lists
 * nobody asked for stay unasked.
 *
 * @param {Array<{ name: string, dynamic?: boolean }>} filtersConfig
 *   Filter entries; each `dynamic: true` entry's `name` is looked up in `loaders`.
 * @param {Object<string, { fetch: (opts: { force: boolean }) => Promise<any>, build: (data: any) => Array<{value, label}> }>} loaders
 *   App-provided registry mapping filter name → { fetch, build }. `fetch` gets
 *   `{ force }`, true when the user asked for fresh data. `build` must tolerate
 *   an empty array — that call is what produces the placeholder options.
 * @returns {{ dynamicOptions: Object<string, { options: Array, loading: boolean, ensure: Function }>, isLoading: boolean }}
 *   `isLoading` covers a user-initiated refresh only, which is the one case
 *   where blocking the whole panel is right. A single list loading behind an
 *   open dropdown reports itself through that entry's `loading`.
 */
const useFilterDynamicOptions = (filtersConfig = [], loaders = {}) => {
  // name → { options, loading }. A name absent from here has never been asked
  // for, which is the entire point of this hook.
  const [entries, setEntries] = useState({});
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadersRef = useRef(loaders);
  loadersRef.current = loaders;
  const requestedRef = useRef(new Set());
  const placeholdersRef = useRef({});
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const load = useCallback(async (name, force) => {
    const loader = loadersRef.current[name];
    if (!loader) return;
    setEntries((prev) => ({
      ...prev,
      [name]: { options: prev[name]?.options ?? [], loading: true },
    }));
    let options = null;
    try {
      options = loader.build(await loader.fetch({ force }));
    } catch (err) {
      console.error(`Failed to load ${name} options:`, err);
      // Forget the request so reopening the dropdown retries. A transient
      // outage should not leave the filter permanently empty for the session.
      requestedRef.current.delete(name);
    }
    if (!mountedRef.current) return;
    setEntries((prev) => ({
      ...prev,
      [name]: { options: options ?? [], loading: false },
    }));
  }, []);

  const ensure = useCallback((name) => {
    if (requestedRef.current.has(name)) return;
    requestedRef.current.add(name);
    load(name, false);
  }, [load]);

  useEffect(
    () =>
      subscribeToCacheBust((namespace) => {
        if (namespace !== null && namespace !== CACHE_NS_FILTER_OPTIONS) return;
        const names = [...requestedRef.current];
        if (names.length === 0) return;
        setIsRefreshing(true);
        Promise.all(names.map((name) => load(name, true))).finally(() => {
          if (mountedRef.current) setIsRefreshing(false);
        });
      }),
    [load]
  );

  const names = useMemo(
    () =>
      filtersConfig
        .filter((f) => f && f.dynamic && loaders[f.name])
        .map((f) => f.name),
    [filtersConfig, loaders]
  );
  const namesSignature = names.join('|');

  const dynamicOptions = useMemo(() => {
    const map = {};
    namesSignature.split('|').filter(Boolean).forEach((name) => {
      if (!(name in placeholdersRef.current)) {
        try {
          placeholdersRef.current[name] = loadersRef.current[name].build([]);
        } catch {
          placeholdersRef.current[name] = [];
        }
      }
      const entry = entries[name];
      map[name] = {
        // A load that failed leaves nothing behind; falling back to the
        // placeholder keeps the "All X" entry, which is also what a genuinely
        // empty list resolves to.
        options: entry?.options?.length ? entry.options : placeholdersRef.current[name],
        loading: Boolean(entry?.loading),
        ensure: () => ensure(name),
      };
    });
    return map;
  }, [namesSignature, entries, ensure]);

  return { dynamicOptions, isLoading: isRefreshing };
};

export { useFilterDynamicOptions };
