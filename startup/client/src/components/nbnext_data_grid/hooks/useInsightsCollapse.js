import { useCallback, useEffect, useRef, useState } from "react";

// Owns the collapsed state for the insights panel. Auto-collapses the first
// time fullscreen is entered (so the grid gets more vertical room), but
// otherwise leaves the state under user control.
const useInsightsCollapse = (fullScreen) => {
  const [collapsed, setCollapsed] = useState(fullScreen);
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
