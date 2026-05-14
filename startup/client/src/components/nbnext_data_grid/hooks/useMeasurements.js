import { useState, useEffect } from "react";
import { TOOLBAR_HEIGHT, MIN_BODY_HEIGHT, DENSITY_CONFIG } from "../utils/constants";

const useMeasurements = (headerRef, firstRowRef, pagedRows, visibleColumns, density, autoHeight, fullScreen = false, insightsRef = null) => {
  const { rowHeight, headerHeight } = DENSITY_CONFIG[density] || DENSITY_CONFIG.comfortable;

  const [measuredHeaderHeight, setMeasuredHeaderHeight] = useState(null);
  const [measuredRowHeight, setMeasuredRowHeight] = useState(null);
  // Measured height of the tabs + insights section that sits above the
  // toolbar+scroll area. Without this, a tall Common Values panel squeezes
  // the table body since the container's auto-height ignores it.
  const [measuredInsightsHeight, setMeasuredInsightsHeight] = useState(0);

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
      if (insightsRef && insightsRef.current) {
        const rect = insightsRef.current.getBoundingClientRect();
        setMeasuredInsightsHeight(rect && rect.height ? Math.ceil(rect.height) : 0);
      } else {
        setMeasuredInsightsHeight(0);
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

      if (insightsRef && insightsRef.current) {
        resizeObserver.observe(insightsRef.current);
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
  }, [headerRef, firstRowRef, insightsRef]);

  // Header/row heights returned for downstream consumers (virtual scrolling, etc).
  // In autoHeight mode, rows can grow per content — we don't sum a uniform row
  // height for the container; we let CSS auto-size it instead.
  const effHeaderHeight = autoHeight ? (measuredHeaderHeight || headerHeight) : headerHeight;
  const effRowHeight = autoHeight ? (measuredRowHeight || rowHeight) : rowHeight;
  const rowCount = pagedRows?.length || 0;

  // Fixed-mode body: uniform rowHeight × rowCount, floored to MIN_BODY_HEIGHT
  // so empty/filtered states still have presence.
  const buffer = rowCount > 0 ? Math.ceil(rowHeight * 0.5) : 0;
  const fixedBodyHeight = Math.max(headerHeight + (rowHeight * rowCount) + buffer, MIN_BODY_HEIGHT);
  // Only count toolbars that sit outside the scroll area: top + bottom (filter/total row are inside table)
  const toolbarCount = fullScreen ? 3 : 2;
  // Insights section (tabs + Common Values panel) sits above the toolbar
  const insightsHeight = fullScreen ? 0 : measuredInsightsHeight;
  const fixedContainerHeight = (TOOLBAR_HEIGHT * toolbarCount) + fixedBodyHeight + insightsHeight;

  const computedContainerHeight = fullScreen
    ? "100vh"
    : (autoHeight ? "auto" : fixedContainerHeight);

  return {
    rowHeight,
    headerHeight,
    effHeaderHeight,
    effRowHeight,
    computedContainerHeight,
  };
};

export { useMeasurements };

