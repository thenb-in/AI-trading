import { useCallback, useEffect, useState } from "react";

// Provides internal fullscreen state + Alt+F keyboard shortcut. If the parent
// controls fullScreen via prop, the shortcut is disabled and external value wins.
const useFullScreenToggle = (externalFullScreen) => {
  const [internalFullScreen, setInternalFullScreen] = useState(false);
  const fullScreen =
    externalFullScreen !== undefined ? externalFullScreen : internalFullScreen;

  const handleToggleFullScreen = useCallback(() => {
    setInternalFullScreen((prev) => !prev);
  }, []);

  useEffect(() => {
    if (externalFullScreen !== undefined) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      const isAltF = event.altKey && event.code === "KeyF";
      if (!isAltF) return;

      const target = event.target;
      const isEditableTarget =
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

      if (isEditableTarget) return;

      event.preventDefault();
      setInternalFullScreen((prev) => !prev);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [externalFullScreen]);

  return { fullScreen, handleToggleFullScreen };
};

export { useFullScreenToggle };
