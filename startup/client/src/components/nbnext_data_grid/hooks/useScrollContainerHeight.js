import { useEffect, useState } from "react";

// Measures the scroll area's clientHeight in fullscreen, feeding virtual scrolling.
const useScrollContainerHeight = (fullScreen, scrollAreaRef, computedContainerHeight) => {
  const [scrollContainerHeight, setScrollContainerHeight] = useState(0);

  useEffect(() => {
    if (!fullScreen || !scrollAreaRef.current) {
      setScrollContainerHeight(0);
      return undefined;
    }

    const updateHeight = () => {
      if (scrollAreaRef.current) {
        setScrollContainerHeight(scrollAreaRef.current.clientHeight || 0);
      }
    };

    updateHeight();

    const resizeObserver = new ResizeObserver(updateHeight);
    if (scrollAreaRef.current) {
      resizeObserver.observe(scrollAreaRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
    // scrollAreaRef is a ref object, so listing it costs nothing — its identity
    // is stable across renders and only `.current` moves.
  }, [fullScreen, computedContainerHeight, scrollAreaRef]);

  return scrollContainerHeight;
};

export { useScrollContainerHeight };
