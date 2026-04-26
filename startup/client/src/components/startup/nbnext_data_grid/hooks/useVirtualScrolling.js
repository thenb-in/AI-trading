import { useState, useEffect, useRef, useMemo, useCallback } from "react";

/**
 * Virtual scrolling hook for efficient rendering of large datasets
 * Only renders visible rows plus a buffer for smooth scrolling
 */
const useVirtualScrolling = (
  allRows,
  rowHeight,
  containerHeight,
  scrollElement = null,
  overscan = 5 // Number of rows to render outside visible area
) => {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef(scrollElement);

  // Update scroll element ref
  useEffect(() => {
    scrollElementRef.current = scrollElement;
  }, [scrollElement]);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    if (!allRows || allRows.length === 0 || !rowHeight || !containerHeight) {
      return { start: 0, end: 0, visibleRows: [] };
    }

    const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / rowHeight);
    const endIndex = Math.min(
      allRows.length,
      startIndex + visibleCount + overscan * 2
    );

    return {
      start: startIndex,
      end: endIndex,
      visibleRows: allRows.slice(startIndex, endIndex),
      totalHeight: allRows.length * rowHeight,
      offsetY: startIndex * rowHeight,
    };
  }, [allRows, rowHeight, containerHeight, scrollTop, overscan]);

  // Handle scroll event
  const handleScroll = useCallback((e) => {
    const target = e.target;
    setScrollTop(target.scrollTop);
  }, []);

  // Attach scroll listener
  useEffect(() => {
    const element = scrollElementRef.current;
    if (!element) return;

    // Initial scroll position
    setScrollTop(element.scrollTop || 0);

    element.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      element.removeEventListener("scroll", handleScroll);
    };
  }, [handleScroll, scrollElement]);

  return {
    visibleRows: visibleRange.visibleRows,
    startIndex: visibleRange.start,
    endIndex: visibleRange.end,
    totalHeight: visibleRange.totalHeight,
    offsetY: visibleRange.offsetY,
    handleScroll,
  };
};

export { useVirtualScrolling };
