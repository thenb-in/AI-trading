import { useCallback, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { ToastContext } from "./ToastContext";
import { ToastViewport } from "./ToastViewport";

const DEFAULT_DURATION_MS = 5000;
const MAX_VISIBLE_TOASTS = 3;

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const anchorRef = useRef(null);
  const timersRef = useRef(new Map());

  const dismissToast = useCallback((id) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((toast) => {
    const id = toast.id || `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const duration = toast.duration ?? DEFAULT_DURATION_MS;

    setToasts((prev) => {
      const next = [...prev, { ...toast, id }];
      return next.slice(-MAX_VISIBLE_TOASTS);
    });

    if (duration > 0) {
      const timer = setTimeout(() => dismissToast(id), duration);
      timersRef.current.set(id, timer);
    }

    return id;
  }, [dismissToast]);

  const registerAnchor = useCallback((ref) => {
    anchorRef.current = ref;
  }, []);

  const value = useMemo(
    () => ({
      showToast,
      dismissToast,
      registerAnchor,
    }),
    [showToast, dismissToast, registerAnchor]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport
        toasts={toasts}
        anchorRef={anchorRef}
        onDismiss={dismissToast}
      />
    </ToastContext.Provider>
  );
}

ToastProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export { ToastProvider };
