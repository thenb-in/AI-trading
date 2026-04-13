import { useCallback, useEffect, useRef, useState } from "react";

// Tracks which toolbar (top vs bottom) initiated a page change and shows a
// floating "scroll to top" button only when the bottom toolbar triggered it.
const useScrollToTopOnPagination = ({ page, fullScreen, goToNextPage, goToPrevPage }) => {
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const prevPageRef = useRef(page);
  const paginationSourceRef = useRef(null);

  const handleGoToNextPage = useCallback(
    (source) => {
      paginationSourceRef.current = source;
      goToNextPage();
    },
    [goToNextPage]
  );

  const handleGoToPrevPage = useCallback(
    (source) => {
      paginationSourceRef.current = source;
      goToPrevPage();
    },
    [goToPrevPage]
  );

  const handleTopGoToNextPage = useCallback(() => handleGoToNextPage("top"),   [handleGoToNextPage]);
  const handleTopGoToPrevPage = useCallback(() => handleGoToPrevPage("top"),   [handleGoToPrevPage]);
  const handleBottomGoToNextPage = useCallback(() => handleGoToNextPage("bottom"), [handleGoToNextPage]);
  const handleBottomGoToPrevPage = useCallback(() => handleGoToPrevPage("bottom"), [handleGoToPrevPage]);

  useEffect(() => {
    if (fullScreen) {
      setShowScrollToTop(false);
      prevPageRef.current = page;
      paginationSourceRef.current = null;
      return;
    }

    if (page !== prevPageRef.current && prevPageRef.current !== undefined) {
      if (paginationSourceRef.current === "bottom") {
        setShowScrollToTop(true);
      }
      paginationSourceRef.current = null;
    }
    prevPageRef.current = page;
  }, [page, fullScreen]);

  useEffect(() => {
    if (!fullScreen && showScrollToTop) {
      const handleScroll = () => {
        if (window.scrollY === 0) setShowScrollToTop(false);
      };
      window.addEventListener("scroll", handleScroll, { passive: true });
      return () => window.removeEventListener("scroll", handleScroll);
    }
    return undefined;
  }, [showScrollToTop, fullScreen]);

  const handleScrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setShowScrollToTop(false);
  }, []);

  return {
    showScrollToTop,
    handleScrollToTop,
    handleTopGoToNextPage,
    handleTopGoToPrevPage,
    handleBottomGoToNextPage,
    handleBottomGoToPrevPage,
  };
};

export { useScrollToTopOnPagination };
