import { toast } from 'react-toastify';
import { cacheBustAll } from '@services/cacheManager';
import { CACHE_CLEAR_RELOAD_DELAY_MS } from '@startup/constants/cache';

/**
 * Drop every cached API entry (memory, sessionStorage, localStorage, IndexedDB)
 * and every service-worker Cache Storage bucket, then reload from the network.
 * Auth tokens and user preferences are not touched — they live outside both.
 * The reload waits at least CACHE_CLEAR_RELOAD_DELAY_MS so the toast is seen.
 */
const clearCacheAndReload = async () => {
  toast.info('Clearing cache…');
  const cacheStorageNames = 'caches' in window ? await window.caches.keys() : [];
  await Promise.all([
    cacheBustAll(),
    ...cacheStorageNames.map((name) => window.caches.delete(name)),
    new Promise((resolve) => setTimeout(resolve, CACHE_CLEAR_RELOAD_DELAY_MS)),
  ]);
  window.location.reload();
};

export { clearCacheAndReload };
