import { useEffect } from 'react';
import { matchesShortcutDef } from '@utils/keyboardShortcut';
import { clearCacheAndReload } from '@utils/clearCacheAndReload';
import { SHORTCUTS } from '@startup/constants/shortcuts';

/**
 * Ctrl+Shift+R (⌘⇧R on a Mac) clears the app cache before reloading, so a hard
 * refresh really fetches fresh data. Listens directly rather than through
 * useShortcut, which stands down while a dialog is open — a hard refresh must
 * work from anywhere.
 */
function useClearCacheShortcut() {
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.repeat || !matchesShortcutDef(event, SHORTCUTS.CLEAR_CACHE_REFRESH)) return;
      event.preventDefault();
      clearCacheAndReload();
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, []);
}

export { useClearCacheShortcut };
