import { useMemo } from 'react';

/**
 * Pure helper used by app-side hooks: walks a filter config array and replaces
 * `options` on any entry whose `name` matches a key in `dynamicOptions`.
 * Also flips `searchable: true` so Filter.jsx renders SearchableDropdown.
 *
 * Generic — knows nothing about employees/departments/etc. App-side hooks
 * own the fetching and provide the keyed map.
 */
const injectDynamicOptions = (filters, dynamicOptions) =>
  filters.map((f) =>
    dynamicOptions[f.name]
      ? { ...f, options: dynamicOptions[f.name], searchable: true }
      : f
  );

/**
 * Memoized wrapper around injectDynamicOptions. Pass in your already-fetched
 * dynamicOptions map (from an app-side fetcher hook) and a base filter config;
 * returns the merged config stable across renders.
 */
const useFilterConfig = (baseFilters, dynamicOptions) =>
  useMemo(
    () => injectDynamicOptions(baseFilters, dynamicOptions),
    [baseFilters, dynamicOptions]
  );

export { injectDynamicOptions, useFilterConfig };
