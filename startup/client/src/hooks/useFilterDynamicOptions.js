import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';

/**
 * Generic dynamic filter-options hook.
 *
 * Reads a filters config array, collects entries marked `dynamic: true`, and
 * resolves their options via the caller-supplied `loaders` registry. App-side
 * code owns the loaders (what to fetch, how to build options); this hook only
 * orchestrates the load, manages loading state, and handles cancellation.
 *
 * @param {Array<{ name: string, dynamic?: boolean }>} filtersConfig
 *   Filter entries; each `dynamic: true` entry's `name` is looked up in `loaders`.
 * @param {Object<string, { fetch: () => Promise<any>, build: (data: any) => Array<{value, label}> }>} loaders
 *   App-provided registry mapping filter name → { fetch, build }.
 * @returns {{ dynamicOptions: Object<string, Array>, isLoading: boolean }}
 */
const useFilterDynamicOptions = (filtersConfig = [], loaders = {}) => {
  const [dynamicOptions, setDynamicOptions] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  const keysToLoad = useMemo(
    () =>
      filtersConfig
        .filter((f) => f && f.dynamic && loaders[f.name])
        .map((f) => f.name),
    [filtersConfig, loaders]
  );
  const keysSignature = keysToLoad.join('|');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      try {
        const results = await Promise.all(
          keysToLoad.map((key) =>
            loaders[key].fetch().catch((err) => {
              console.error(`Failed to fetch ${key} options:`, err);
              return null;
            })
          )
        );
        if (cancelled) return;
        const next = {};
        keysToLoad.forEach((key, idx) => {
          const raw = results[idx];
          if (raw !== null) {
            try {
              next[key] = loaders[key].build(raw);
            } catch (err) {
              console.error(`Failed to build ${key} options:`, err);
            }
          }
        });
        setDynamicOptions(next);
      } catch (err) {
        console.error('Failed to fetch filter options:', err);
        toast.error('Failed to fetch filter options');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
    // keysSignature captures content of keysToLoad; loaders is captured by closure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keysSignature]);

  return { dynamicOptions, isLoading };
};

export { useFilterDynamicOptions };
