import { useMemo, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { Navigate } from "react-router-dom";
import { useDataContext } from "@context/useDataContext";
import { hasPermission } from "@utils/hasPermission";
import { VIEW_NOTIFICATION_PERMISSION } from "../constants/notifications";
import { useNotifications } from "./hooks/useNotifications";
import { NotificationGroups } from "./components/NotificationGroups";
import { EmptyState } from "./components/EmptyState";
import { groupNotifications } from "./notificationUtils";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
];

function NotificationsPage() {
  const { userData } = useDataContext();
  const canViewNotifications = hasPermission(userData, VIEW_NOTIFICATION_PERMISSION);
  const {
    items,
    unreadCount,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    markRead,
    markAllRead,
  } = useNotifications();
  const [filter, setFilter] = useState("all");

  const visible = useMemo(
    () => (filter === "unread" ? items.filter((n) => !n.read) : items),
    [items, filter]
  );
  const groups = useMemo(() => groupNotifications(visible), [visible]);

  if (!canViewNotifications) {
    return <Navigate to="/admin/navigator" replace />;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      {/* Header */}
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gray-800 text-white">
            <Bell className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900">
              Notifications
            </h1>
            <p className="mt-0.5 text-sm text-gray-500">
              {unreadCount > 0
                ? `You have ${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}.`
                : "You're all caught up."}
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllRead}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gray-800 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </button>
        )}
      </header>

      {/* Filter tabs */}
      <div className="mb-4 inline-flex gap-1 rounded-lg bg-gray-100 p-1">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`inline-flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {f.label}
              {f.key === "unread" && unreadCount > 0 && (
                <span className="rounded-full bg-blue-100 px-1.5 text-xs font-semibold text-blue-700">
                  {unreadCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* List */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="px-4 py-16 text-center text-sm text-gray-400">
            Loading notifications…
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            title={
              filter === "unread"
                ? "No unread notifications"
                : "No notifications yet"
            }
            description={
              filter === "unread"
                ? "You've read everything here."
                : "New notifications will appear here."
            }
          />
        ) : (
          <NotificationGroups groups={groups} onMarkRead={markRead} />
        )}
      </div>

      {/* Load more (only meaningful in the unfiltered view) */}
      {filter === "all" && hasMore && !loading && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60"
          >
            {loadingMore ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}

export { NotificationsPage };
