import { useEffect, useState } from "react";

const useSidebarWidth = (fullScreen) => {
  const [sidebarWidth, setSidebarWidth] = useState(0);

  useEffect(() => {
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
