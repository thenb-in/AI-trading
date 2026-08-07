import { useRef } from "react";
import PropTypes from "prop-types";
import { useClickOutsideToClose } from "@/hooks/useClickOutsideToClose";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { useNotifications } from "./hooks/useNotifications";
import { NotificationHeader } from "./components/NotificationHeader";
import { NotificationList } from "./components/NotificationList";
import { NotificationFooter } from "./components/NotificationFooter";


function NotificationPanel({ onClose, triggerRef }) {
  const panelRef = useRef(null);
  const { groups, unreadCount, markRead, markAllRead } = useNotifications();

  useClickOutsideToClose(panelRef, true, onClose, triggerRef);
  useEscapeKey(onClose, true);

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Notifications"
      className="absolute bottom-0 left-full z-[100000] ml-3 flex max-h-[75vh] w-[420px] max-w-[calc(100vw-5rem)] flex-col overflow-hidden rounded-2xl bg-white text-gray-900 shadow-[0_20px_60px_-15px_rgba(15,23,42,0.45)] ring-1 ring-slate-900/10"
    >
      <NotificationHeader
        unreadCount={unreadCount}
        onMarkAllRead={markAllRead}
        onClose={onClose}
      />
      <NotificationList groups={groups} onMarkRead={markRead} onNavigate={onClose} />
      <NotificationFooter onNavigate={onClose} />
    </div>
  );
}

NotificationPanel.propTypes = {
  onClose: PropTypes.func.isRequired,
  triggerRef: PropTypes.shape({ current: PropTypes.instanceOf(Element) }),
};

export { NotificationPanel };
