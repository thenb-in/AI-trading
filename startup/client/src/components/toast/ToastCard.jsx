import { useCallback, useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { X } from "lucide-react";
import { TYPE_STYLES, DEFAULT_VARIANT } from "../../notifications/constants";

// `onOpen` makes the whole card actionable — a toast that announces something
// you'd want to look at should take you there, not just tell you and vanish.
// Toasts without one stay purely informational.
//
// The countdown bar shows how long is left before the toast dismisses itself,
// and hovering (or focusing) the card pauses both the bar and the real timer, so
// nothing disappears out from under a reader or a cursor on its way to click.
function ToastCard({
  id,
  title,
  message,
  variant = DEFAULT_VARIANT,
  duration = 0,
  onDismiss,
  onOpen,
  onPause,
  onResume,
}) {
  const style = TYPE_STYLES[variant] || TYPE_STYLES[DEFAULT_VARIANT];
  const { Icon } = style;
  const clickable = Boolean(onOpen);
  const showTimer = duration > 0;
  const barRef = useRef(null);
  const [paused, setPaused] = useState(false);

  // Same CSS-variable pattern the rest of the app uses for animations driven by
  // runtime values (see .circular-loading-bar in App.css).
  useEffect(() => {
    if (!barRef.current) return;
    barRef.current.style.setProperty("--toast-duration", `${duration}ms`);
    barRef.current.style.setProperty("--toast-timer-state", paused ? "paused" : "running");
  }, [duration, paused]);

  const pause = useCallback(() => {
    setPaused(true);
    onPause?.(id);
  }, [id, onPause]);

  const resume = useCallback(() => {
    setPaused(false);
    onResume?.(id);
  }, [id, onResume]);

  const handleDismiss = useCallback((event) => {
    // Dismissing must not also open it.
    event.stopPropagation();
    onDismiss(id);
  }, [id, onDismiss]);

  const handleOpen = useCallback(() => {
    if (!onOpen) return;
    onDismiss(id);
    onOpen();
  }, [id, onDismiss, onOpen]);

  const handleKeyDown = useCallback((event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleOpen();
    }
  }, [handleOpen]);

  return (
    <div
      role={clickable ? "button" : "status"}
      aria-live="polite"
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? handleOpen : undefined}
      onKeyDown={clickable ? handleKeyDown : undefined}
      onMouseEnter={pause}
      onMouseLeave={resume}
      onFocus={pause}
      onBlur={resume}
      className={`pointer-events-auto w-80 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg ring-1 ring-black/5 ${
        clickable
          ? "cursor-pointer transition-shadow hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          : ""
      }`}
    >
      <div className="flex gap-3 p-4">
        <span
          className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${style.ringClass}`}
        >
          <Icon className={`h-4 w-4 ${style.iconClass}`} />
        </span>

        <div className="min-w-0 flex-1">
          {title ? (
            <p className={`text-sm font-semibold ${clickable ? "text-blue-700" : "text-gray-900"}`}>
              {title}
            </p>
          ) : null}
          {message ? (
            <p className={`text-sm leading-relaxed text-gray-600 ${title ? "mt-1" : ""}`}>
              {message}
            </p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          aria-label="Dismiss notification"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {showTimer ? (
        <div className="h-1 w-full bg-gray-100">
          <div ref={barRef} className={`toast-timer-bar h-full ${style.timerClass || "bg-gray-400"}`} />
        </div>
      ) : null}
    </div>
  );
}

ToastCard.propTypes = {
  id: PropTypes.string.isRequired,
  title: PropTypes.string,
  message: PropTypes.string,
  variant: PropTypes.string,
  duration: PropTypes.number,
  onDismiss: PropTypes.func.isRequired,
  onOpen: PropTypes.func,
  onPause: PropTypes.func,
  onResume: PropTypes.func,
};

export { ToastCard };
