import { useEffect, useState } from "react";

// Measures the scroll area's clientHeight in fullscreen mode, feeding virtual
// scrolling with an accurate container height.
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullScreen, computedContainerHeight]);

  return scrollContainerHeight;
};

export { useScrollContainerHeight };
