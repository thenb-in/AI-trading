import { useState, useEffect } from "react";
import { TOOLBAR_HEIGHT, MIN_BODY_HEIGHT, DENSITY_CONFIG } from "../utils/constants.js";

const useMeasurements = (headerRef, firstRowRef, pagedRows, visibleColumns, density, autoHeight, height, fullScreen = false) => {
  const { rowHeight, headerHeight } = DENSITY_CONFIG[density] || DENSITY_CONFIG.comfortable;

  const [measuredHeaderHeight, setMeasuredHeaderHeight] = useState(null);
  const [measuredRowHeight, setMeasuredRowHeight] = useState(null);

  useEffect(() => {
    let raf = null;
    const measure = () => {
      console.log("[useMeasurements] Initial measure - checking refs:", {
        headerRefExists: !!headerRef.current,
        firstRowRefExists: !!firstRowRef.current,
      });
      
      if (headerRef.current) {
        const rect = headerRef.current.getBoundingClientRect();
        console.log("[useMeasurements] Header rect:", rect);
        if (rect && rect.height) {
          const newHeight = Math.ceil(rect.height);
          console.log("[useMeasurements] Initial measure - header height:", newHeight);
          setMeasuredHeaderHeight(newHeight);
        } else {
          console.log("[useMeasurements] Header rect has no height:", rect);
        }
      } else {
        console.log("[useMeasurements] headerRef.current is null");
      }
      
      if (firstRowRef.current) {
        const rect = firstRowRef.current.getBoundingClientRect();
        console.log("[useMeasurements] First row rect:", rect);
        if (rect && rect.height) {
          const newHeight = Math.ceil(rect.height);
          console.log("[useMeasurements] Initial measure - row height:", newHeight);
          setMeasuredRowHeight(newHeight);
        } else {
          console.log("[useMeasurements] First row rect has no height:", rect);
        }
      } else {
        console.log("[useMeasurements] firstRowRef.current is null (no rows or not rendered yet)");
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
          console.log("[useMeasurements] ResizeObserver/window resize - header height:", newHeight);
          setMeasuredHeaderHeight(newHeight);
        }
      }
      if (firstRowRef.current) {
        const rect = firstRowRef.current.getBoundingClientRect();
        if (rect && rect.height) {
          const newHeight = Math.ceil(rect.height);
          console.log("[useMeasurements] ResizeObserver/window resize - row height:", newHeight);
          setMeasuredRowHeight(newHeight);
        }
      }
    };

    // Use ResizeObserver to detect when elements actually change size
    const resizeObserver = new ResizeObserver((entries) => {
      console.log("[useMeasurements] ResizeObserver triggered, entries:", entries.length);
      measureElements();
    });

    // Try to observe elements immediately if they exist
    const setupObservers = () => {
      if (headerRef.current) {
        console.log("[useMeasurements] Setting up ResizeObserver for header");
        resizeObserver.observe(headerRef.current);
      } else {
        console.log("[useMeasurements] headerRef.current not available for ResizeObserver");
      }
      
      if (firstRowRef.current) {
        console.log("[useMeasurements] Setting up ResizeObserver for first row");
        resizeObserver.observe(firstRowRef.current);
      } else {
        console.log("[useMeasurements] firstRowRef.current not available for ResizeObserver (no rows)");
      }
    };

    // Try immediately
    setupObservers();

    // Also try after a short delay in case elements aren't rendered yet
    const timeoutId = setTimeout(() => {
      console.log("[useMeasurements] Retrying ResizeObserver setup after delay");
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
  // Calculate body height: header + all rows
  // Add buffer to ensure all rows are fully visible, accounting for rounding, spacing, and border issues
  // Buffer is approximately 3/4 of a row height to prevent partial row cutoff
  const buffer = rowCount > 0 ? Math.ceil(effRowHeight * 2.5) : 0;
  const calculatedBodyHeight = effHeaderHeight + (effRowHeight * rowCount) + buffer;
  // Ensure minimum body height even when no rows are present (e.g., when filters return no results)
  const computedBodyHeight = Math.max(calculatedBodyHeight, MIN_BODY_HEIGHT);
  // In fullscreen mode, use 100vh, otherwise use calculated height
  const computedContainerHeight = fullScreen 
    ? "100vh" 
    : (autoHeight ? (TOOLBAR_HEIGHT + computedBodyHeight) : height);

  // Log effective values being used
  useEffect(() => {
    console.log("[useMeasurements] Effective values:", {
      effHeaderHeight,
      effRowHeight,
      rowCount,
      computedBodyHeight,
      computedContainerHeight,
      autoHeight,
      height,
      TOOLBAR_HEIGHT,
      calculatedAutoHeight: TOOLBAR_HEIGHT + computedBodyHeight,
      usingMeasuredHeader: measuredHeaderHeight !== null,
      usingMeasuredRow: measuredRowHeight !== null,
    });
  }, [effHeaderHeight, effRowHeight, rowCount, computedBodyHeight, computedContainerHeight, autoHeight, height, measuredHeaderHeight, measuredRowHeight]);

  return {
    rowHeight,
    headerHeight,
    effHeaderHeight,
    effRowHeight,
    computedContainerHeight,
  };
};

export { useMeasurements };

