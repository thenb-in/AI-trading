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

export {
  sortByOrder,
  getDefaultForConfig,
  parseParamValue,
  serializeAppliedValue,
};
