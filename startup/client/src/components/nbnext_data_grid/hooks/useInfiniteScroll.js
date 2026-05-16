import { useEffect } from "react";

const useInfiniteScroll = ({
  enabled,
  rootRef,
  sentinelRef,
  hasMore,
  isLoadingMore,
  onLoadMore,
}) => {
  useEffect(() => {
    if (!enabled) return;
    if (typeof onLoadMore !== "function") return;
    if (!hasMore) return;
    const sentinel = sentinelRef?.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first?.isIntersecting) return;
        if (isLoadingMore) return;
        onLoadMore();
      },
      {
        root: rootRef?.current ?? null,
        rootMargin: "200px",
        threshold: 0.1,
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [enabled, rootRef, sentinelRef, hasMore, isLoadingMore, onLoadMore]);
};

export { useInfiniteScroll };
