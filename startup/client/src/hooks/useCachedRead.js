import { useEffect, useState } from 'react';
import { subscribeToCacheBust } from '@startup/services/cacheManager';

/**
 * Reads a list that ApiService caches under `namespace`, and reads it again
 * whenever a write expires that namespace — so every open view of the list
 * picks up the change without its own bookkeeping.
 *
 * `read` takes no arguments and resolves to the response; define it at module
 * level so it stays the same between renders. Returns `{ data, status, error }`
 * where `data` is the response body and `status` is loading | ready | error.
 */
const useCachedRead = (read, namespace) => {
  const [state, setState] = useState({ data: null, status: 'loading', error: null });

  useEffect(() => {
    let active = true;
    const load = () =>
      read()
        .then((response) => active && setState({ data: response.data, status: 'ready', error: null }))
        .catch((error) => active && setState((prev) => ({ ...prev, status: 'error', error })));
    load();
    const unsubscribe = subscribeToCacheBust((busted) => busted === namespace && load());
    return () => {
      active = false;
      unsubscribe();
    };
  }, [read, namespace]);

  return state;
};

export { useCachedRead };
