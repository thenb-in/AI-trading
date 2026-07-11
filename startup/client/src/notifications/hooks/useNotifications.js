import { useContext } from "react";
import { NotificationContext } from "../NotificationContext";


const EMPTY = {
  items: [],
  groups: [],
  unreadCount: 0,
  loading: false,
  loadingMore: false,
  hasMore: false,
  loadMore: () => {},
  markRead: () => {},
  markAllRead: () => {},
};

function useNotifications() {
  return useContext(NotificationContext) || EMPTY;
}

export { useNotifications };
