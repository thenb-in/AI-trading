import { useEffect } from 'react';

/**
 * Closes a modal (or any popover) when a `mousedown` lands outside the element pointed to by `ref`,
 * but only while `isActive` is true so we don't keep stale listeners around on the document.
 *
 * Pass `ignoreRef` for the element that toggles the popover (e.g. its trigger button): clicks on it
 * are ignored here so the trigger's own handler can close the popover, instead of this closing it on
 * `mousedown` and the trigger immediately reopening it on `click`.
 */
function useClickOutsideToClose(ref, isActive, onClose, ignoreRef) {
  useEffect(() => {
    if (!isActive) return undefined;
    const handleClickOutside = (event) => {
      if (ignoreRef?.current && ignoreRef.current.contains(event.target)) return;
      if (ref.current && !ref.current.contains(event.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [ref, isActive, onClose, ignoreRef]);
}

export { useClickOutsideToClose };
