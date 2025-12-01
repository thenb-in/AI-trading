import { useState, useEffect } from "react";
import { TOOLBAR_HEIGHT, DENSITY_CONFIG } from "../utils/constants.js";

const useMeasurements = (headerRef, firstRowRef, pagedRows, visibleColumns, density, autoHeight, height) => {
  const { rowHeight, headerHeight } = DENSITY_CONFIG[density] || DENSITY_CONFIG.comfortable;

  const [measuredHeaderHeight, setMeasuredHeaderHeight] = useState(null);
  const [measuredRowHeight, setMeasuredRowHeight] = useState(null);

  useEffect(() => {
    let raf = null;
    const measure = () => {
      if (headerRef.current) {
        const rect = headerRef.current.getBoundingClientRect();
        if (rect && rect.height) {
          setMeasuredHeaderHeight(Math.ceil(rect.height));
        }
      }
      if (firstRowRef.current) {
        const rect = firstRowRef.current.getBoundingClientRect();
        if (rect && rect.height) {
          setMeasuredRowHeight(Math.ceil(rect.height));
        }
      }
    };
    raf = window.requestAnimationFrame(measure);
    return () => {
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [pagedRows, visibleColumns, density, headerRef, firstRowRef]);

  useEffect(() => {
    const onResize = () => {
      if (headerRef.current) {
        const rect = headerRef.current.getBoundingClientRect();
        if (rect && rect.height) setMeasuredHeaderHeight(Math.ceil(rect.height));
      }
      if (firstRowRef.current) {
        const rect = firstRowRef.current.getBoundingClientRect();
        if (rect && rect.height) setMeasuredRowHeight(Math.ceil(rect.height));
      }
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [headerRef, firstRowRef]);

  const effHeaderHeight = measuredHeaderHeight || headerHeight;
  const effRowHeight = measuredRowHeight || rowHeight;
  const rowCount = pagedRows?.length || 0;
  const computedBodyHeight = effHeaderHeight + (effRowHeight * rowCount) + (rowCount > 0 ? 20 : 0);
  const computedContainerHeight = autoHeight ? (TOOLBAR_HEIGHT + computedBodyHeight) : height;

  return {
    rowHeight,
    headerHeight,
    effHeaderHeight,
    effRowHeight,
    computedContainerHeight,
  };
};

export { useMeasurements };

