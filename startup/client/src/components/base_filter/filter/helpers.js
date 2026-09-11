import { DEFAULT_FILTER_ORDER } from './constants';

/** Stable comparator for sorting filter configs by their `order` field. */
const sortByOrder = (a, b) =>
  (a.order || DEFAULT_FILTER_ORDER) - (b.order || DEFAULT_FILTER_ORDER);

/**
 * Resolve the initial value for a filter config when no URL param is present.
 * `dateFallback(name)` is invoked only for date filters without a default.
 */
const getDefaultForConfig = (config, dateFallback) => {
  if (config.default !== undefined) return config.default;
  if (config.type === 'checkbox') return false;
  if (config.type === 'date') return dateFallback(config.name);
  return 'all';
};

/** Convert a raw URL search-param value into the in-memory filter value. */
const parseParamValue = (config, paramValue) => {
  if (config.type === 'checkbox') return paramValue === 'true';
  if (config.type === 'select' && config.multiselect) {
    const values = paramValue.split(',').filter((v) => v !== 'all');
    return values.length > 0 ? values : 'all';
  }
  return paramValue;
};

/**
 * Serialize a filter value for the apply payload. Returns `undefined` when
 * the filter should be omitted (e.g. 'all' without `alwaysInclude`).
 */
const serializeAppliedValue = (config, value) => {
  if (value === undefined || value === null) return undefined;
  if (config.type === 'checkbox') return value ? 'true' : 'false';
  if (config.type === 'select' && config.multiselect) {
    if (Array.isArray(value) && value.length > 0) return value.join(',');
    if (value !== 'all') return value;
    return config.alwaysInclude ? 'all' : undefined;
  }
  if (config.alwaysInclude) return value;
  return value !== 'all' ? value : undefined;
};

/** URL → filter values: each config's param parsed, or its default when absent. */
const filterValuesFromParams = (configs, searchParams, dateFallback) =>
  configs.reduce((values, config) => {
    const paramValue = searchParams.get(config.name);
    values[config.name] = paramValue !== null
      ? parseParamValue(config, paramValue)
      : getDefaultForConfig(config, dateFallback);
    return values;
  }, {});

/** Filter values → what goes to the URL, the report and the server. */
const serializeFilterValues = (configs, values) =>
  configs.reduce((applied, config) => {
    const serialized = serializeAppliedValue(config, values[config.name]);
    if (serialized !== undefined) applied[config.name] = serialized;
    return applied;
  }, {});

/** Filter values without the empty ones — nothing to filter by is not a filter. */
const sanitizeFilterValues = (values) =>
  Object.entries(values || {}).reduce((kept, [key, value]) => {
    if (value === null || value === undefined || value === '') return kept;
    if (Array.isArray(value)) {
      const items = value.filter((v) => v !== null && v !== undefined && v !== '');
      if (items.length > 0) kept[key] = items;
      return kept;
    }
    kept[key] = value;
    return kept;
  }, {});

/** Filter values → the URL, replacing what is there (no new history entry). */
const writeFilterValuesToParams = (values, setSearchParams) => {
  const params = new URLSearchParams();
  Object.entries(sanitizeFilterValues(values)).forEach(([key, value]) => {
    if (typeof value === 'boolean') {
      params.set(key, value ? 'true' : 'false');
    } else if (Array.isArray(value)) {
      if (!(value.length === 1 && value[0] === 'all')) {
        params.set(key, value.join(','));
      }
    } else {
      params.set(key, value);
    }
  });
  setSearchParams(params, { replace: true });
};

/** A report's own defaults into the URL — only the params it does not already carry. */
const applyDefaultFiltersToSearchParams = (defaultFilters, searchParams, setSearchParams) => {
  if (!defaultFilters || !Object.keys(defaultFilters).length) return;
  const nextParams = new URLSearchParams(searchParams);
  let needsUpdate = false;
  Object.entries(defaultFilters).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (!nextParams.has(key)) {
      nextParams.set(key, String(value));
      needsUpdate = true;
    }
  });
  if (needsUpdate) setSearchParams(nextParams, { replace: true });
};

export {
  sortByOrder,
  getDefaultForConfig,
  parseParamValue,
  serializeAppliedValue,
  filterValuesFromParams,
  serializeFilterValues,
  sanitizeFilterValues,
  writeFilterValuesToParams,
  applyDefaultFiltersToSearchParams,
};
