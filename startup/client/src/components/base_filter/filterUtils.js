import { useMemo } from 'react';

/**
 * Pure helper used by app-side hooks: walks a filter config array and merges in
 * the resolved state of any entry whose `name` matches a key in
 * `dynamicOptions` (the map returned by `useFilterDynamicOptions`).
 * Also flips `searchable: true` so Filter.jsx renders SearchableDropdown.
 *
 * Each entry carries its own `options`, a `loading` flag — which tells the
 * dropdown its empty list is temporary and not the "nothing to pick" state —
 * and `ensure`, the callback that actually goes and fetches. `ensure` is
 * exposed on the config as `onOpenOptions`, and nothing is fetched until
 * someone calls it: opening the dropdown, or a filter arriving with a value
 * whose label has to be resolved. Once a list has loaded, its `refresh` is
 * exposed as `onRefreshOptions` — what the filter panel's refresh button calls.
 *
 * Generic — knows nothing about what an app's own masters are. App-side hooks
 * own the fetching and provide the keyed map.
 */
const injectDynamicOptions = (filters, dynamicOptions) =>
  filters.map((f) => {
    const entry = dynamicOptions[f.name];
    if (!entry) return f;
    return {
      ...f,
      options: entry.options,
      searchable: true,
      optionsLoading: entry.loading,
      onOpenOptions: entry.ensure,
      onRefreshOptions: entry.refresh,
    };
  });

/**
 * Memoized wrapper around injectDynamicOptions. Pass in the map from
 * `useFilterDynamicOptions` and a base filter config; returns the merged config
 * stable across renders.
 */
const useFilterConfig = (baseFilters, dynamicOptions) =>
  useMemo(
    () => injectDynamicOptions(baseFilters, dynamicOptions),
    [baseFilters, dynamicOptions]
  );

export { injectDynamicOptions, useFilterConfig };
