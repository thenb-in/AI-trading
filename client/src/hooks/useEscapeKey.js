import { useEffect } from 'react';

/**
 * Custom hook to handle escape key press for closing modals
 * @param {Function} onClose - Function to call when escape key is pressed
 * @param {boolean} isActive - Whether the hook should be active (modal is open)
 */
const useEscapeKey = (onClose, isActive = true) => {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && isActive) {
        onClose();
      }
    };

    if (isActive) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, isActive]);
};

export { useEscapeKey };
