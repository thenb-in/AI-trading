import { useEffect } from "react";

// Horizontal step (px) per Left/Right arrow press. Vertical reuses the row
// height so Up/Down advance roughly one row at a time.
const HORIZONTAL_STEP = 80;

// In fullscreen the grid has no surrounding page chrome to scroll, so the
// arrow keys feel dead. This hook makes them drive the grid's own scroll area:
// Left/Right scroll horizontally (the common pain with many columns), Up/Down
// scroll vertically. It stays out of the way while focus is in a filter input
// or any editable element so typing/caret movement keeps working.
const useArrowKeyScroll = (enabled, scrollAreaRef, rowHeight) => {
  useEffect(() => {
    if (!enabled) return undefined;

    const handleKeyDown = (event) => {
      const code = event.code;
      const isArrow =
        code === "ArrowLeft" ||
        code === "ArrowRight" ||
        code === "ArrowUp" ||
        code === "ArrowDown";
      if (!isArrow) return;

      // Don't steal arrow keys from editable targets (column filter inputs,
      // textareas, selects, contentEditable).
      const target = event.target;
      const isEditableTarget =
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
      if (isEditableTarget) return;

      const scrollEl = scrollAreaRef.current;
      if (!scrollEl) return;

      const verticalStep = rowHeight || HORIZONTAL_STEP;

      switch (code) {
        case "ArrowLeft":
          scrollEl.scrollLeft -= HORIZONTAL_STEP;
          break;
        case "ArrowRight":
          scrollEl.scrollLeft += HORIZONTAL_STEP;
          break;
        case "ArrowUp":
          scrollEl.scrollTop -= verticalStep;
          break;
        case "ArrowDown":
          scrollEl.scrollTop += verticalStep;
          break;
        default:
          return;
      }

      // Prevent the page/window from also scrolling on the same keypress.
      event.preventDefault();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [enabled, scrollAreaRef, rowHeight]);
};

export { useArrowKeyScroll };
