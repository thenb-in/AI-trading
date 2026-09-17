import { useLayoutEffect, useState } from "react";

// Layout effect so the fullscreen grid is offset past the sidebar before its
// first paint, instead of painting over the sidebar and then jumping right.
const useSidebarWidth = (fullScreen) => {
  const [sidebarWidth, setSidebarWidth] = useState(0);

  useLayoutEffect(() => {
    if (!fullScreen) {
      setSidebarWidth(0);
      return;
    }

    const detectSidebarWidth = () => {
      const sidebar = document.querySelector(".sidebar-container");
      if (sidebar) {
        const rect = sidebar.getBoundingClientRect();
        if (rect.width > 0 && window.getComputedStyle(sidebar).display !== "none") {
          setSidebarWidth(rect.width);
        } else {
          setSidebarWidth(0);
        }
      } else {
        setSidebarWidth(0);
      }
    };

    detectSidebarWidth();

    window.addEventListener("resize", detectSidebarWidth);

    const observer = new MutationObserver(detectSidebarWidth);
    const sidebar = document.querySelector(".sidebar-container");
    if (sidebar) {
      observer.observe(sidebar, {
        attributes: true,
        attributeFilter: ["class", "style"],
      });
    }

    return () => {
      window.removeEventListener("resize", detectSidebarWidth);
      observer.disconnect();
    };
  }, [fullScreen]);

  return sidebarWidth;
};

export { useSidebarWidth };
