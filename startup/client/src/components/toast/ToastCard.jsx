import PropTypes from "prop-types";
import { X } from "lucide-react";
import { TYPE_STYLES, DEFAULT_VARIANT } from "../../notifications/constants";

function ToastCard({ title, message, variant = DEFAULT_VARIANT, onDismiss }) {
  const style = TYPE_STYLES[variant] || TYPE_STYLES[DEFAULT_VARIANT];
  const { Icon } = style;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-auto w-80 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg ring-1 ring-black/5"
    >
      <div className="flex gap-3 p-4">
        <span
          className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${style.ringClass}`}
        >
          <Icon className={`h-4 w-4 ${style.iconClass}`} />
        </span>

        <div className="min-w-0 flex-1">
          {title ? (
            <p className="text-sm font-semibold text-gray-900">{title}</p>
          ) : null}
          {message ? (
            <p className={`text-sm leading-relaxed text-gray-600 ${title ? "mt-1" : ""}`}>
              {message}
            </p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          aria-label="Dismiss notification"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

ToastCard.propTypes = {
  title: PropTypes.string,
  message: PropTypes.string,
  variant: PropTypes.string,
  onDismiss: PropTypes.func.isRequired,
};

export { ToastCard };
