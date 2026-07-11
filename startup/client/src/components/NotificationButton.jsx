import { useRef, useState, useCallback, useEffect } from "react";
import { Bell } from "lucide-react";
import PropTypes from "prop-types";
import { useDataContext, hasPermission } from "@context/useDataContext";
import { VIEW_NOTIFICATION_PERMISSION } from "../constants/notifications";
import { NotificationPanel } from "../notifications/NotificationPanel";
import { useNotifications } from "../notifications/hooks/useNotifications";
import { useToast } from "./toast";

function NotificationButton({ collapsed }) {
  const dataContext = useDataContext();
  const canViewNotifications = hasPermission(VIEW_NOTIFICATION_PERMISSION, dataContext);
  const [open, setOpen] = useState(false);
  const buttonRef = useRef(null);
  const wrapperRef = useRef(null);
  const { unreadCount } = useNotifications();
  const { registerAnchor } = useToast();

  useEffect(() => {
    registerAnchor(wrapperRef);
  }, [registerAnchor]);

  const toggleOpen = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  const closePanel = useCallback(() => {
    setOpen(false);
  }, []);

  if (!canViewNotifications) {
    return null;
  }

  return (
    <div ref={wrapperRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleOpen}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`relative w-full flex items-center justify-center rounded-lg transition-colors font-medium ${
          open ? "bg-gray-700 text-white" : "hover:bg-gray-700 text-gray-300"
        } ${collapsed ? "p-2" : "p-3"}`}
        title="Notification"
        aria-label="Notification"
      >
        <span className="relative flex-shrink-0">
          <Bell className="w-5 h-5" size={20} />
          {unreadCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </span>
        {!collapsed && <span className="ml-2">Notification</span>}
      </button>

      {open && (
        <NotificationPanel
          onClose={closePanel}
          triggerRef={buttonRef}
        />
      )}
    </div>
  );
}

NotificationButton.propTypes = {
  collapsed: PropTypes.bool.isRequired,
};

export { NotificationButton };
