import { Check } from "lucide-react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import { TYPE_STYLES, DEFAULT_VARIANT } from "../constants";
import { notificationShape } from "../notificationShape";


// `onNavigate` lets the container react to the jump — the bell panel closes
// itself with it; the full-page list has nothing to do and leaves it out.
function NotificationItem({ item, onMarkRead, onNavigate }) {
  const style = TYPE_STYLES[item.variant] || TYPE_STYLES[DEFAULT_VARIANT];
  const { Icon } = style;
  const navigate = useNavigate();

  // The whole row is the target when there is somewhere to go — hunting for a
  // link inside a notification is the kind of small friction that makes people
  // stop opening the bell. Acting on it implies having read it.
  const handleOpen = () => {
    if (!item.link) return;
    if (!item.read) onMarkRead(item.id);
    onNavigate?.();
    navigate(item.link);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleOpen();
    }
  };

  // Marking as read must not also open the notification.
  const handleMarkRead = (event) => {
    event.stopPropagation();
    onMarkRead(item.id);
  };

  const clickable = Boolean(item.link);

  return (
    <li
      onClick={clickable ? handleOpen : undefined}
      onKeyDown={clickable ? handleKeyDown : undefined}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      className={`group relative flex gap-3.5 px-5 py-4 transition-colors hover:bg-gray-50 ${
        item.read ? "" : "bg-blue-50/40"
      } ${clickable ? "cursor-pointer focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500" : ""}`}
    >
      {!item.read && (
        <span className="absolute inset-y-0 left-0 w-1 bg-blue-500" />
      )}

      <span
        className={`mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${style.ringClass}`}
      >
        <Icon className={`h-5 w-5 ${style.iconClass}`} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className={`text-sm font-semibold ${clickable ? "text-blue-700 group-hover:underline" : "text-gray-900"}`}>
            {item.title}
          </p>
          <span className="mt-0.5 flex-shrink-0 whitespace-nowrap text-xs text-gray-400">
            {item.time}
          </span>
        </div>
        <p className="mt-1 text-sm leading-relaxed text-gray-600">
          {item.message}
        </p>
        {!item.read && (
          <button
            type="button"
            onClick={handleMarkRead}
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-blue-600 opacity-0 transition-opacity hover:text-blue-700 focus:opacity-100 group-hover:opacity-100"
          >
            <Check className="h-3 w-3" />
            Mark as read
          </button>
        )}
      </div>
    </li>
  );
}

NotificationItem.propTypes = {
  item: notificationShape.isRequired,
  onMarkRead: PropTypes.func.isRequired,
  onNavigate: PropTypes.func,
};

export { NotificationItem };
