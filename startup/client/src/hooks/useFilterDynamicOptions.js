import { useCallback, useMemo, useRef, useState } from 'react';

/**
 * Generic dynamic filter-options hook — lazy.
 *
 * Reads a filters config array and, for every entry that declares
 * `fetchData`, decides *when* to call it. What to fetch and how to shape it
 * live on the filter itself, beside its name and label, so one entry says
 * everything about one filter.
 *
 * Nothing is fetched on mount. A list loads the first time its dropdown is
 * opened (or immediately, if that filter arrived with a non-default value that
 * needs labels — see FilterField), so a list the user never opens costs
 * nothing. Until then the dropdown shows the filter's own `options` — in
 * practice just the "All X" entry.
 *
 * Caching is ApiService's job: `fetchData` reads through it, so reopening a
 * report reuses the lists already fetched. Once a list has loaded, its entry
 * carries `refresh`, which reloads it with `force` — what the filter panel's
 * refresh button calls.
 *
 * @param {Array<{ name: string, options?: Array, fetchData?: (opts: { force: boolean }) => Promise<Array<{value, label}>> }>} filtersConfig
 * @returns {{ dynamicOptions: Object<string, { options: Array, loading: boolean, ensure?: Function, refresh?: Function }> }}
 *   `ensure` loads a list nobody has asked for yet; `refresh` reloads one that
 *   has loaded.
 */
const useFilterDynamicOptions = (filtersConfig = []) => {
  // name → { options, loading }. A name absent from here has never been asked
  // for, or its last load failed — either way, opening it asks again.
  const [entries, setEntries] = useState({});

  const filtersRef = useRef(filtersConfig);
  filtersRef.current = filtersConfig;

  const load = useCallback(async (name, force) => {
    const filter = filtersRef.current.find((f) => f.name === name);
    setEntries((prev) => ({ ...prev, [name]: { options: prev[name]?.options ?? [], loading: true } }));
    try {
      const options = await filter.fetchData({ force });
      setEntries((prev) => ({ ...prev, [name]: { options, loading: false } }));
    } catch (error) {
      console.error(`Failed to load ${name} options:`, error);
      setEntries((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  }, []);

  // Keyed on the names rather than the array, so a caller that rebuilds its
  // config every render doesn't hand out a new options map every render too.
  const namesSignature = filtersConfig
    .filter((f) => f.fetchData)
    .map((f) => f.name)
    .join('|');

  const dynamicOptions = useMemo(() => {
    const map = {};
    namesSignature.split('|').filter(Boolean).forEach((name) => {
      const filter = filtersRef.current.find((f) => f.name === name);
      const entry = entries[name];
      map[name] = {
        options: entry?.options.length ? entry.options : filter.options ?? [],
        loading: Boolean(entry?.loading),
        ensure: entry ? undefined : () => load(name, false),
        refresh: entry ? () => load(name, true) : undefined,
      };
    });
    return map;
  }, [namesSignature, entries, load]);

  return { dynamicOptions };
};

export { useFilterDynamicOptions };
