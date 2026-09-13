import { useEffect } from 'react';

/**
 * Calls `onClose` when Escape is pressed while `isActive`.
 *
 * `capture` claims the key before any bubbling listener sees it — for a popover
 * inside a modal, whose own Escape listener registered first and would
 * otherwise close the modal along with it.
 */
const useEscapeKey = (onClose, isActive = true, { capture = false } = {}) => {
  useEffect(() => {
    if (!isActive) return undefined;

    const handleKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      if (capture) event.stopPropagation();
      onClose();
    };

    document.addEventListener('keydown', handleKeyDown, capture);
    return () => document.removeEventListener('keydown', handleKeyDown, capture);
  }, [onClose, isActive, capture]);
};

export { useEscapeKey };
