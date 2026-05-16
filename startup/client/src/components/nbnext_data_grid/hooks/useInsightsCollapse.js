import { useCallback, useEffect, useRef, useState } from "react";

// Owns the collapsed state for the insights panel. Auto-collapses the first
// time fullscreen is entered (so the grid gets more vertical room), but
// otherwise leaves the state under user control. Callers can also seed the
// initial state via `initialCollapsed` (e.g. when embedded in a small popup).
const useInsightsCollapse = (fullScreen, initialCollapsed = false) => {
  const [collapsed, setCollapsed] = useState(fullScreen || initialCollapsed);
  const prevFullScreenRef = useRef(fullScreen);

  useEffect(() => {
    const wasFullScreen = prevFullScreenRef.current;
    prevFullScreenRef.current = fullScreen;
    if (!wasFullScreen && fullScreen) {
      setCollapsed(true);
    }
  }, [fullScreen]);

  const toggle = useCallback(() => {
    setCollapsed((prev) => !prev);
  }, []);

  return { collapsed, toggle };
};

export { useInsightsCollapse };
