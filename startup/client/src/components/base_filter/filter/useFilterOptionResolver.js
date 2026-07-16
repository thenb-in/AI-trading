import { useCallback, useEffect, useState } from 'react';
import { isDebugMode, subscribeToDebugMode } from '@services/debugModeService';
import { getFilterOptionResolvers } from './filterOptionResolverRegistry';

/**
 * Returns a config transformer for activity-aware option lists (whose entries
 * carry a boolean `is_active` flag, e.g. the employee filter), matching what
 * the "Is Active" filter is showing:
 *   - is_active ON  → show active employees only (inactive entries dropped)
 *   - is_active OFF → show active + inactive; inactive entries get `highlight`
 *
 * App-specific rules (e.g. weekly employees vs debug mode) register via
 * `registerFilterOptionResolver` and run after the built-in transforms.
 */
const useFilterOptionResolver = (filters) => {
  const isActiveOff = filters.is_active === false;
  const [debugMode, setDebugMode] = useState(() => isDebugMode());

  useEffect(() => subscribeToDebugMode(setDebugMode), []);

  return useCallback(
    (config) => {
      if (config.type !== 'select' || !Array.isArray(config.options)) return config;

      let options = config.options;

      if (options.some((o) => typeof o.is_active === 'boolean')) {
        options = isActiveOff
          ? options.map((o) =>
              o.is_active === false ? { ...o, highlight: true } : o
            )
          : options.filter((o) => o.is_active !== false);
      }

      let resolved = { ...config, options };
      const context = { filters, debugMode };

      getFilterOptionResolvers().forEach((resolver) => {
        resolved = resolver(resolved, context);
      });

      return resolved;
    },
    [filters, isActiveOff, debugMode]
  );
};

export { useFilterOptionResolver };
