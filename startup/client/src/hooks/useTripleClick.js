import { useRef } from "react";

const TRIPLE_CLICK_WINDOW_MS = 600;

/**
 * Fires `onTripleClick` when the returned handler is called three times in quick
 * succession.
 */
const useTripleClick = (onTripleClick, windowMs = TRIPLE_CLICK_WINDOW_MS) => {
  const clickCount = useRef(0);
  const resetTimer = useRef(null);

  return () => {
    clearTimeout(resetTimer.current);
    clickCount.current += 1;

    if (clickCount.current >= 3) {
      clickCount.current = 0;
      onTripleClick();
      return;
    }

    resetTimer.current = setTimeout(() => {
      clickCount.current = 0;
    }, windowMs);
  };
};

export { useTripleClick };
