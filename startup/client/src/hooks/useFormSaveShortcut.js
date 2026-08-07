import { useCallback } from 'react';
import { SHORTCUTS } from '@startup/constants/shortcuts';
import { useShortcut } from '@startup/hooks/useShortcut';

/**
 * Ctrl+S / Cmd+S submits the form held by `containerRef` — the save shortcut for
 * dialogs whose footer is hand-rolled rather than a `FormFooter`. Registered as
 * a fallback, so a footer that binds Save itself still wins.
 */
const useFormSaveShortcut = (containerRef, { enabled = true } = {}) => {
  const submitContainedForm = useCallback(() => {
    containerRef.current?.querySelector('form')?.requestSubmit();
  }, [containerRef]);

  useShortcut(SHORTCUTS.SAVE, submitContainedForm, { enabled, fallback: true });
};

export { useFormSaveShortcut };
