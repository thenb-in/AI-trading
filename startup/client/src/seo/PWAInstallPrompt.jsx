import { useEffect, useState, useCallback } from 'react';
import { Button, Snackbar, Stack, Typography } from '@mui/material';

// Captures the `beforeinstallprompt` event that Chromium-based browsers
// fire when the site meets PWA install criteria, defers it, and re-fires
// on user gesture (clicking the Install button). Without deferring, the
// browser's native UI is too easy to miss on desktop, and on Android the
// "Add to Home screen" hint appears too aggressively / not at all.
//
// Behavior:
//   - Listens for `beforeinstallprompt`; stores the event.
//   - Listens for `appinstalled`; hides the prompt thereafter.
//   - Renders a small, dismissible Snackbar with an "Install" button. If
//     the user dismisses, we remember in localStorage and don't re-show
//     for 14 days (avoids the "PWA pestering" anti-pattern).
//   - On iOS Safari, where `beforeinstallprompt` doesn't exist, we render
//     a separate one-time hint pointing to the share-sheet flow because
//     iOS PWAs MUST be installed manually.

const STORAGE_KEY = 'pwa-install-dismissed-at';
const DISMISS_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

function isIos() {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
}

function isStandalone() {
  // Two ways to detect: the modern display-mode media query, and iOS's
  // legacy `navigator.standalone`. Combining both covers every browser.
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches
    || window.navigator.standalone === true
  );
}

function wasRecentlyDismissed() {
  try {
    const at = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
    return Date.now() - at < DISMISS_WINDOW_MS;
  } catch { return false; }
}

function PWAInstallPrompt() {
  const [installEvent, setInstallEvent] = useState(null);
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    if (wasRecentlyDismissed()) return;

    const onBeforeInstall = (e) => {
      // Chromium fires this when the PWA criteria are met. Default UI is
      // a tiny address-bar icon; preventDefault + storing the event lets
      // us render a more visible prompt.
      e.preventDefault();
      setInstallEvent(e);
    };
    const onInstalled = () => setInstallEvent(null);

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);

    // iOS path — no beforeinstallprompt, so we show our own hint after a
    // short delay so it doesn't compete with the page's first paint.
    let iosTimer;
    if (isIos()) {
      iosTimer = setTimeout(() => setShowIosHint(true), 4000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
      if (iosTimer) clearTimeout(iosTimer);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!installEvent) return;
    installEvent.prompt();
    try { await installEvent.userChoice; } catch { /* user closed */ }
    setInstallEvent(null);
  }, [installEvent]);

  const handleDismiss = useCallback(() => {
    try { localStorage.setItem(STORAGE_KEY, String(Date.now())); } catch { /* noop */ }
    setInstallEvent(null);
    setShowIosHint(false);
  }, []);

  if (installEvent) {
    return (
      <Snackbar
        open
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        message={
          <Stack spacing={0}>
            <Typography variant="body2" fontWeight={600}>Install this app</Typography>
            <Typography variant="caption">Works offline · faster launch · home-screen icon</Typography>
          </Stack>
        }
        action={
          <Stack direction="row" spacing={1}>
            <Button onClick={handleInstall} size="small" variant="contained" color="primary">
              Install
            </Button>
            <Button onClick={handleDismiss} size="small" color="inherit">
              Not now
            </Button>
          </Stack>
        }
      />
    );
  }

  if (showIosHint) {
    return (
      <Snackbar
        open
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        message={
          <Stack spacing={0}>
            <Typography variant="body2" fontWeight={600}>Install on iOS</Typography>
            <Typography variant="caption">
              Tap the Share icon, then choose &ldquo;Add to Home Screen&rdquo;.
            </Typography>
          </Stack>
        }
        action={
          <Button onClick={handleDismiss} size="small" color="inherit">
            Got it
          </Button>
        }
      />
    );
  }

  return null;
}

export { PWAInstallPrompt };
