import { useCallback, useRef } from 'react';

/**
 * A handle on a BaseMaster's reload for what sits beside it — a print preview,
 * an import, a next-document form — so saving there refreshes the list in place.
 * Pass `subscribeToRefresh` to the BaseMaster and call `reload()`.
 */
const useMasterReload = () => {
  const reloadRef = useRef(() => {});
  const subscribeToRefresh = useCallback((reload) => {
    reloadRef.current = reload;
  }, []);
  const reload = useCallback(() => reloadRef.current(), []);
  return { reload, subscribeToRefresh };
};

export { useMasterReload };
