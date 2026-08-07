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

  // Each live toast's countdown: { timerId, remaining, startedAt }. Tracking the
  // remaining time (rather than just the timeout handle) is what lets a toast be
  // paused mid-flight and picked up again where it left off.
  const dismissToast = useCallback((id) => {
    const entry = timersRef.current.get(id);
    if (entry?.timerId) {
      clearTimeout(entry.timerId);
    }
    timersRef.current.delete(id);
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const startTimer = useCallback((id, remaining) => {
    if (remaining <= 0) {
      return;
    }
    const timerId = setTimeout(() => dismissToast(id), remaining);
    timersRef.current.set(id, { timerId, remaining, startedAt: Date.now() });
  }, [dismissToast]);

  // Hovering or focusing a toast holds it open — nobody should have to race a
  // countdown to read or click the thing it is telling them about.
  const pauseToast = useCallback((id) => {
    const entry = timersRef.current.get(id);
    if (!entry?.timerId) {
      return;
    }
    clearTimeout(entry.timerId);
    timersRef.current.set(id, {
      timerId: null,
      remaining: Math.max(0, entry.remaining - (Date.now() - entry.startedAt)),
      startedAt: Date.now(),
    });
  }, []);

  const resumeToast = useCallback((id) => {
    const entry = timersRef.current.get(id);
    if (!entry || entry.timerId) {
      return;
    }
    startTimer(id, entry.remaining);
  }, [startTimer]);

  const showToast = useCallback((toast) => {
    const id = toast.id || `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const duration = toast.duration ?? DEFAULT_DURATION_MS;

    setToasts((prev) => {
      const next = [...prev, { ...toast, id, duration }];
      return next.slice(-MAX_VISIBLE_TOASTS);
    });

    startTimer(id, duration);

    return id;
  }, [startTimer]);

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
        onPause={pauseToast}
        onResume={resumeToast}
      />
    </ToastContext.Provider>
  );
}

ToastProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export { ToastProvider };
