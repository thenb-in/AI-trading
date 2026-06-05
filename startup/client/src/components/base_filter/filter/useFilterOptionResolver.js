import { useCallback } from 'react';

/**
 * Returns a config transformer for activity-aware option lists (whose entries
 * carry a boolean `is_active` flag, e.g. the employee filter), matching what
 * the "Is Active" filter is showing:
 *   - is_active ON  → show active employees only (inactive entries dropped)
 *   - is_active OFF → show active + inactive; inactive entries get `highlight`
 *
 * Lists without an `is_active` flag, and the 'all' entry (which has none), are
 * returned untouched.
 */
const useFilterOptionResolver = (filters) => {
  const isActiveOff = filters.is_active === false;

  return useCallback(
    (config) => {
      if (config.type !== 'select' || !Array.isArray(config.options)) return config;
      if (!config.options.some((o) => typeof o.is_active === 'boolean')) return config;

      const options = isActiveOff
        ? config.options.map((o) =>
            o.is_active === false ? { ...o, highlight: true } : o
          )
        : config.options.filter((o) => o.is_active !== false);

      return { ...config, options };
    },
    [isActiveOff]
  );
};

export { useFilterOptionResolver };
