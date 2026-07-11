import { Check } from "lucide-react";
import PropTypes from "prop-types";
import { TYPE_STYLES, DEFAULT_VARIANT } from "../constants";
import { notificationShape } from "../notificationShape";


function NotificationItem({ item, onMarkRead }) {
  const style = TYPE_STYLES[item.variant] || TYPE_STYLES[DEFAULT_VARIANT];
  const { Icon } = style;

  return (
    <li
      className={`group relative flex gap-3.5 px-5 py-4 transition-colors hover:bg-gray-50 ${
        item.read ? "" : "bg-blue-50/40"
      }`}
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
          <p className="text-sm font-semibold text-gray-900">{item.title}</p>
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
            onClick={() => onMarkRead(item.id)}
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
};

export { NotificationItem };
