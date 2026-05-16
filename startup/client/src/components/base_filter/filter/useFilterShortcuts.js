import { useEffect, useRef } from 'react';

/**
 * Alt+Enter applies filters when focus, click target, or last pointer-down
 * was inside the filter panel. Pointer-down is tracked separately because
 * dropdowns/date-pickers render their popups in a portal outside the panel,
 * so by the time keyup fires neither activeElement nor target is inside.
 */
const useFilterShortcuts = ({ containerRef, onApply, disabled }) => {
  const latestRef = useRef({ onApply, disabled });
  latestRef.current = { onApply, disabled };

  useEffect(() => {
    const container = () => containerRef.current;
    const isInsideContainer = (node) =>
      node instanceof Node && container()?.contains(node);

    let pointerWasInside = false;

    const onPointerDown = (event) => {
      pointerWasInside = isInsideContainer(event.target);
    };

    const onKeyDown = (event) => {
      if (!event.altKey || event.key !== 'Enter') return;
      if (latestRef.current.disabled) return;
      if (
        !isInsideContainer(event.target) &&
        !isInsideContainer(document.activeElement) &&
        !pointerWasInside
      ) return;

      event.preventDefault();
      void latestRef.current.onApply();
    };

    document.addEventListener('pointerdown', onPointerDown, { capture: true });
    document.addEventListener('keydown', onKeyDown, { capture: true });
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, { capture: true });
      document.removeEventListener('keydown', onKeyDown, { capture: true });
    };
  }, [containerRef]);
};

export { useFilterShortcuts };
