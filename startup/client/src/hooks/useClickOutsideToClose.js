import { useEffect } from 'react';

/**
 * Closes a modal (or any popover) when a `mousedown` lands outside the element pointed to by `ref`,
 * but only while `isActive` is true so we don't keep stale listeners around on the document.
 */
function useClickOutsideToClose(ref, isActive, onClose) {
  useEffect(() => {
    if (!isActive) return undefined;
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [ref, isActive, onClose]);
}

export { useClickOutsideToClose };
