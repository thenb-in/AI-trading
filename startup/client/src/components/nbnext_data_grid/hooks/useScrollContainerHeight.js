import { useLayoutEffect, useState } from "react";

// Measures the scroll area's clientHeight in fullscreen, feeding virtual scrolling.
// Layout effect: with a height of 0 the virtual window is empty, so measuring
// after paint flashed a blank grid on entering fullscreen.
const useScrollContainerHeight = (fullScreen, scrollAreaRef, computedContainerHeight) => {
  const [scrollContainerHeight, setScrollContainerHeight] = useState(0);

  useLayoutEffect(() => {
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
