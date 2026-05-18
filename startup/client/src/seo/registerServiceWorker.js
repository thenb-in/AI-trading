// Service worker registration helper. Uses workbox-window so the SW
// auto-update flow gets a real client-side prompt instead of the user
// having to hard-refresh to pick up new versions.
//
// Wiring (in main.jsx):
//
//   import { registerServiceWorker } from '@startup/seo/registerServiceWorker';
//   registerServiceWorker();
//
// In dev (`vite dev`) this is a no-op because vite-plugin-pwa disables
// the generated SW. In `vite preview` and production, the SW lives at
// /sw.js (the plugin's default output path).

import { Workbox } from 'workbox-window';

const SW_URL = '/sw.js';
const SCOPE = '/';

let registered = false;

/**
 * Register the production service worker. Safe to call multiple times —
 * subsequent calls are no-ops. The returned promise resolves to the
 * `Workbox` instance on success or `null` if SW isn't supported / in dev.
 */
async function registerServiceWorker(options = {}) {
  if (registered) return null;
  registered = true;

  if (typeof window === 'undefined') return null;
  if (!('serviceWorker' in navigator)) return null;
  if (import.meta.env.DEV) return null;

  const wb = new Workbox(SW_URL, { scope: SCOPE });

  // Reload when a new SW takes control. Without this, users keep running
  // stale assets after a deploy until they manually refresh.
  wb.addEventListener('controlling', () => {
    // Give Workbox a tick to settle, then full reload. Using a hard-reload
    // (`location.reload()`) is intentional — partial soft-navigation can
    // mix old + new chunks and crash the app.
    setTimeout(() => window.location.reload(), 0);
  });

  // When the SW says "I have a new version waiting" we ask Workbox to
  // skipWaiting() so it activates immediately. Apps that want a manual
  // "update available, click to refresh" UX can pass `manualUpdates: true`
  // and call wb.messageSkipWaiting() themselves.
  if (!options.manualUpdates) {
    wb.addEventListener('waiting', () => {
      wb.messageSkipWaiting();
    });
  } else if (typeof options.onUpdateAvailable === 'function') {
    wb.addEventListener('waiting', () => {
      options.onUpdateAvailable(() => wb.messageSkipWaiting());
    });
  }

  try {
    await wb.register();
    return wb;
  } catch (err) {
    // SW registration failing isn't fatal — the app still loads. Log so
    // browser devtools surface it during development of the SW config.
     
    console.warn('[pwa] service-worker registration failed', err);
    return null;
  }
}

export { registerServiceWorker };
