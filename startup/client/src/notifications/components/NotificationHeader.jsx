import { Bell, X } from "lucide-react";
import PropTypes from "prop-types";


function NotificationHeader({ unreadCount, onMarkAllRead, onClose }) {
  return (
    <div className="flex items-center justify-between bg-gray-800 px-4 py-3.5 text-white">
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
          <Bell className="h-4 w-4 text-white" />
        </span>
        <h3 className="text-sm font-semibold tracking-tight text-white">
          Notifications
        </h3>
        {unreadCount > 0 && (
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold text-white">
            {unreadCount} new
          </span>
        )}
      </div>

      <div className="flex items-center gap-1">
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={onMarkAllRead}
            className="rounded-md px-2 py-1 text-xs font-medium text-white/90 transition-colors hover:bg-white/15"
          >
            Mark all read
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close notifications"
          className="rounded-md p-1 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

NotificationHeader.propTypes = {
  unreadCount: PropTypes.number.isRequired,
  onMarkAllRead: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export { NotificationHeader };
