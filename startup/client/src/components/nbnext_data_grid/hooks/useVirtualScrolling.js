import { useState, useLayoutEffect, useMemo, useCallback } from "react";

/**
 * Virtual scrolling hook for efficient rendering of large datasets
 * Only renders visible rows plus a buffer for smooth scrolling
 *
 * Scroll position and row height are read in layout effects (before paint), so
 * entering fullscreen never flashes an empty or wrong window of rows.
 */
const useVirtualScrolling = (
  allRows,
  rowHeight,
  containerHeight,
  scrollElement = null,
  overscan = 5 // Number of rows to render outside visible area
) => {
  const hasRows = allRows.length > 0;
  const [measuredRowHeight, setMeasuredRowHeight] = useState(0);
  const effectiveRowHeight = measuredRowHeight || rowHeight;
  const [firstVisibleIndex, setFirstVisibleIndex] = useState(0);

  const syncFirstVisibleIndex = useCallback(() => {
    if (scrollElement && effectiveRowHeight) {
      setFirstVisibleIndex(Math.floor(scrollElement.scrollTop / effectiveRowHeight));
    }
  }, [scrollElement, effectiveRowHeight]);

  // Attach scroll listener
  useLayoutEffect(() => {
    if (!hasRows || !scrollElement) return undefined;

    syncFirstVisibleIndex();
    scrollElement.addEventListener("scroll", syncFirstVisibleIndex, { passive: true });

    return () => {
      scrollElement.removeEventListener("scroll", syncFirstVisibleIndex);
    };
  }, [hasRows, scrollElement, syncFirstVisibleIndex]);


  useLayoutEffect(() => {
    if (!hasRows || !scrollElement) return;
    const renderedRows = scrollElement.querySelectorAll(":scope > table > tbody > tr[data-grid-row]");
    if (renderedRows.length === 0) return;

    const firstTop = renderedRows[0].getBoundingClientRect().top;
    const lastBottom = renderedRows[renderedRows.length - 1].getBoundingClientRect().bottom;
    setMeasuredRowHeight((lastBottom - firstTop) / renderedRows.length);
  }, [hasRows, allRows, containerHeight, scrollElement]);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    if (!hasRows || !effectiveRowHeight || !containerHeight) {
      return { start: 0, visibleRows: [], offsetY: 0, bottomOffset: 0 };
    }

    const visibleCount = Math.ceil(containerHeight / effectiveRowHeight);
    const lastWindowIndex = Math.max(0, allRows.length - visibleCount);
    const startIndex = Math.max(0, Math.min(firstVisibleIndex, lastWindowIndex) - overscan);
    const endIndex = Math.min(
      allRows.length,
      startIndex + visibleCount + overscan * 2
    );

    return {
      start: startIndex,
      visibleRows: allRows.slice(startIndex, endIndex),
      offsetY: startIndex * effectiveRowHeight,
      bottomOffset: (allRows.length - endIndex) * effectiveRowHeight,
    };
  }, [hasRows, allRows, effectiveRowHeight, containerHeight, firstVisibleIndex, overscan]);

  return {
    visibleRows: visibleRange.visibleRows,
    startIndex: visibleRange.start,
    offsetY: visibleRange.offsetY,
    bottomOffset: visibleRange.bottomOffset,
  };
};

export { useVirtualScrolling };
