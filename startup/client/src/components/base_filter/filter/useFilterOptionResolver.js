import { useCallback } from 'react';

/**
 * Returns a config transformer that disables options which are incompatible
 * with the current `is_active` filter, so the user can't make a selection that
 * would silently return no data.
 *
 * Activity-aware option lists tag each entry with a boolean `inactive` flag:
 *   - is_active ON  → backend returns active records   → inactive options disabled
 *   - is_active OFF → backend returns inactive records → active options disabled
 *
 * Lists without a boolean `inactive` flag, and the 'all' entry, are returned
 * untouched.
 */
const useFilterOptionResolver = (filters) => {
  const isActiveOff = filters.is_active === false;

  return useCallback(
    (config) => {
      if (config.type !== 'select' || !Array.isArray(config.options)) return config;
      if (!config.options.some((o) => typeof o.inactive === 'boolean')) return config;

      const options = config.options.map((o) => {
        if (typeof o.inactive !== 'boolean') return o;
        const shouldDisable = isActiveOff ? o.inactive === false : o.inactive === true;
        return {
          ...o,
          disabled: shouldDisable,
          title: shouldDisable
            ? (isActiveOff
                ? 'Enable the "Is Active" filter to select an active employee'
                : 'Disable the "Is Active" filter to select an inactive employee')
            : undefined,
        };
      });

      return { ...config, options };
    },
    [isActiveOff]
  );
};

export { useFilterOptionResolver };
