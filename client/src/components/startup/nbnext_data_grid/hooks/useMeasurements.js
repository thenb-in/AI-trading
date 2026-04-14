import { useState, useEffect } from "react";
import { TOOLBAR_HEIGHT, MIN_BODY_HEIGHT, DENSITY_CONFIG } from "../utils/constants.js";

const useMeasurements = (headerRef, firstRowRef, pagedRows, visibleColumns, density, autoHeight, height, fullScreen = false) => {
  const { rowHeight, headerHeight } = DENSITY_CONFIG[density] || DENSITY_CONFIG.comfortable;

  const [measuredHeaderHeight, setMeasuredHeaderHeight] = useState(null);
  const [measuredRowHeight, setMeasuredRowHeight] = useState(null);

  useEffect(() => {
    let raf = null;
    const measure = () => {
      if (headerRef.current) {
        const rect = headerRef.current.getBoundingClientRect();
        if (rect && rect.height) {
          const newHeight = Math.ceil(rect.height);
          setMeasuredHeaderHeight(newHeight);
        }
      }
      
      if (firstRowRef.current) {
        const rect = firstRowRef.current.getBoundingClientRect();
        if (rect && rect.height) {
          const newHeight = Math.ceil(rect.height);
          setMeasuredRowHeight(newHeight);
        }
      }
    };
    raf = window.requestAnimationFrame(measure);
    return () => {
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [pagedRows, visibleColumns, density, headerRef, firstRowRef]);

  useEffect(() => {
    const measureElements = () => {
      if (headerRef.current) {
        const rect = headerRef.current.getBoundingClientRect();
        if (rect && rect.height) {
          const newHeight = Math.ceil(rect.height);
          setMeasuredHeaderHeight(newHeight);
        }
      }
      if (firstRowRef.current) {
        const rect = firstRowRef.current.getBoundingClientRect();
        if (rect && rect.height) {
          const newHeight = Math.ceil(rect.height);
          setMeasuredRowHeight(newHeight);
        }
      }
    };

    // Use ResizeObserver to detect when elements actually change size
    const resizeObserver = new ResizeObserver((entries) => {
      void entries;
      measureElements();
    });

    // Try to observe elements immediately if they exist
    const setupObservers = () => {
      if (headerRef.current) {
        resizeObserver.observe(headerRef.current);
      }
      
      if (firstRowRef.current) {
        resizeObserver.observe(firstRowRef.current);
      }
    };

    // Try immediately
    setupObservers();

    // Also try after a short delay in case elements aren't rendered yet
    const timeoutId = setTimeout(() => {
      setupObservers();
    }, 100);

    // Also listen to window resize as a fallback
    window.addEventListener("resize", measureElements);

    return () => {
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
      window.removeEventListener("resize", measureElements);
    };
  }, [headerRef, firstRowRef]);

  const effHeaderHeight = measuredHeaderHeight || headerHeight;
  // Use measured row height when available, otherwise fall back to config
  // The measured height is more accurate as it accounts for actual rendered size
  const effRowHeight = measuredRowHeight || rowHeight;
  const rowCount = pagedRows?.length || 0;
  // Buffer to avoid partial row cutoff from rounding/borders (keep minimal to reduce gap above footer)
  const buffer = rowCount > 0 ? Math.ceil(effRowHeight * 0.5) : 0;
  const calculatedBodyHeight = effHeaderHeight + (effRowHeight * rowCount) + buffer;
  // Ensure minimum body height even when no rows are present (e.g., when filters return no results)
  const computedBodyHeight = Math.max(calculatedBodyHeight, MIN_BODY_HEIGHT);
  // Only count toolbars that sit outside the scroll area: top + bottom (filter/total row are inside table)
  const toolbarCount = fullScreen ? 3 : 2;
  const calculatedAutoHeight = (TOOLBAR_HEIGHT * toolbarCount) + computedBodyHeight;
  const minHeight = typeof height === "number" ? height : null;

  const computedContainerHeight = fullScreen
    ? "100vh"
    : (autoHeight
      ? (minHeight != null ? Math.max(calculatedAutoHeight, minHeight) : calculatedAutoHeight)
      : height);

  return {
    rowHeight,
    headerHeight,
    effHeaderHeight,
    effRowHeight,
    computedContainerHeight,
  };
};

export { useMeasurements };

