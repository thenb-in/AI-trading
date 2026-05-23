import { useCallback, useEffect, useRef, useState } from "react";

const MOBILE_BREAKPOINT = 640; // sm

const checkIsMobile = () =>
  typeof window !== "undefined" && window.innerWidth < MOBILE_BREAKPOINT;

const getAutoMode = () => (checkIsMobile() ? "cards" : "table");

/**
 * View mode: "table" (default DataGrid render) vs "cards" (CardView render).
 *
 * `initialMode = "auto"` defaults to cards on mobile (<640px) and table otherwise,
 * and follows viewport changes until the user manually toggles. Explicit
 * "table" or "cards" disables auto-tracking — consumer's choice wins.
 *
 * Also returns `isMobile` (tracked on resize) so the grid can drop its fixed
 * height + nested scroll on mobile and let the page scroll naturally.
 */
const useGridViewMode = (initialMode = "auto") => {
  const [mode, setMode] = useState(() =>
    initialMode === "auto" ? getAutoMode() : initialMode,
  );
  const [isMobile, setIsMobile] = useState(() => checkIsMobile());
  const userOverrodeRef = useRef(initialMode !== "auto");

  // Reset to caller's initial value when prop changes.
  useEffect(() => {
    userOverrodeRef.current = initialMode !== "auto";
    setMode(initialMode === "auto" ? getAutoMode() : initialMode);
  }, [initialMode]);

  // Track viewport size: isMobile always updates; mode only follows when auto.
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const handleResize = () => {
      setIsMobile(checkIsMobile());
      if (initialMode === "auto" && !userOverrodeRef.current) {
        setMode(getAutoMode());
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [initialMode]);

  const cycleViewMode = useCallback(() => {
    userOverrodeRef.current = true;
    setMode((prev) => (prev === "table" ? "cards" : "table"));
  }, []);

  return { viewMode: mode, cycleViewMode, isMobile };
};

export { useGridViewMode };
