import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import PropTypes from "prop-types";
import { ToastCard } from "./ToastCard";

function resolveAnchorElement(anchorRef) {
  const stored = anchorRef?.current;
  if (!stored) return null;
  if (typeof stored.getBoundingClientRect === "function") return stored;
  const nested = stored.current;
  if (nested && typeof nested.getBoundingClientRect === "function") return nested;
  return null;
}

function ToastViewport({ toasts, anchorRef, onDismiss, onPause, onResume }) {
  const viewportRef = useRef(null);
  const [position, setPosition] = useState(null);

  useEffect(() => {
    const updatePosition = () => {
      const anchor = resolveAnchorElement(anchorRef);
      if (!anchor) {
        setPosition(null);
        return;
      }

      const rect = anchor.getBoundingClientRect();
      setPosition({
        top: rect.bottom,
        left: rect.right + 12,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [anchorRef, toasts.length]);

  useEffect(() => {
    if (!viewportRef.current || !position) {
      return;
    }
    viewportRef.current.style.setProperty("--toast-top", `${position.top}px`);
    viewportRef.current.style.setProperty("--toast-left", `${position.left}px`);
  }, [position]);

  if (!toasts.length || !position) {
    return null;
  }

  return createPortal(
    <div
      ref={viewportRef}
      className="pointer-events-none fixed top-[var(--toast-top)] left-[var(--toast-left)] z-[100020] flex max-h-[calc(100vh-1rem)] w-80 -translate-y-full flex-col-reverse gap-2 overflow-hidden"
    >
      {toasts.map((toast) => (
        <ToastCard
          key={toast.id}
          id={toast.id}
          title={toast.title}
          message={toast.message}
          variant={toast.variant}
          duration={toast.duration}
          onOpen={toast.onOpen}
          onDismiss={onDismiss}
          onPause={onPause}
          onResume={onResume}
        />
      ))}
    </div>,
    document.body
  );
}

ToastViewport.propTypes = {
  toasts: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string,
      message: PropTypes.string,
      variant: PropTypes.string,
      duration: PropTypes.number,
      onOpen: PropTypes.func,
    })
  ).isRequired,
  anchorRef: PropTypes.shape({ current: PropTypes.any }),
  onDismiss: PropTypes.func.isRequired,
  onPause: PropTypes.func.isRequired,
  onResume: PropTypes.func.isRequired,
};

export { ToastViewport };
