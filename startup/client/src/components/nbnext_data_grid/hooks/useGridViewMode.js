import { useCallback, useEffect, useRef, useState } from "react";

const MOBILE_BREAKPOINT = 640; // sm

const checkIsMobile = () =>
  typeof window !== "undefined" && window.innerWidth < MOBILE_BREAKPOINT;

const getAutoMode = () => (checkIsMobile() ? "cards" : "table");

// Table, cards, board, and round again. A grid with no kanban field of its own
// leaves the board out of the round (NbNextDataGrid drops it from the toggle).
const NEXT_MODE = { table: "cards", cards: "kanban", kanban: "table" };

/**
 * View mode: "table" (default DataGrid render), "cards" (CardView render) or
 * "kanban" (KanbanView render — a lane per value of the grid's kanban field).
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

  // `modes` is what this grid can show, so a grid without a board skips it.
  const cycleViewMode = useCallback((modes) => {
    userOverrodeRef.current = true;
    setMode((prev) => {
      const next = NEXT_MODE[prev] ?? "table";
      return modes?.includes(next) === false ? NEXT_MODE[next] ?? "table" : next;
    });
  }, []);

  // Picked outright rather than stepped to, for a grid with enough views that
  // stepping through them to reach one is the long way round.
  const selectViewMode = useCallback((next) => {
    userOverrodeRef.current = true;
    setMode(next);
  }, []);

  return { viewMode: mode, cycleViewMode, selectViewMode, isMobile };
};

export { useGridViewMode };
