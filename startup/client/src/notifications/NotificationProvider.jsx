import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import { useDataContext } from "@context/useDataContext";
import { hasPermission } from "@utils/hasPermission";
import { VIEW_NOTIFICATION_PERMISSION } from "../constants/notifications";
import { useToast } from "../components/toast";
import { NotificationContext } from "./NotificationContext";
import { notificationApi } from "./notificationApi";
import { subscribeToNotifications } from "./notificationSocket";
import { normalizeNotification } from "./notificationFormat";
import { countUnread, groupNotifications } from "./notificationUtils";

const PAGE_SIZE = 20;

/**
 * Is the user already on the page this notification points at?
 *
 * Compares pathname only: a saved-run link carries ?runId=, and someone sitting
 * on the report they just ran is "already there" whether or not that parameter
 * has landed in the URL yet.
 */
function isViewingLinkTarget(link) {
  if (!link || typeof window === 'undefined') return false;
  try {
    return new URL(link, window.location.origin).pathname === window.location.pathname;
  } catch {
    return false;
  }
}


function NotificationProvider({ children }) {
  const { userData } = useDataContext();
  const canViewNotifications = hasPermission(userData, VIEW_NOTIFICATION_PERMISSION);
  const { showToast } = useToast();
  const navigate = useNavigate();
  const activeCompanyId = userData?.companyId || userData?.company?.id || null;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const loadedCount = useRef(0);
  const shownToastIds = useRef(new Set());

  // Initial history load for the active company.
  useEffect(() => {
    if (!activeCompanyId || !canViewNotifications) {
      setItems([]);
      setLoading(false);
      setHasMore(false);
      loadedCount.current = 0;
      return;
    }

    let cancelled = false;
    setLoading(true);
    loadedCount.current = 0;
    shownToastIds.current = new Set();
    (async () => {
      try {
        const list = await notificationApi.list({ limit: PAGE_SIZE, offset: 0 });
        if (cancelled) return;
        setItems(list.map(normalizeNotification));
        loadedCount.current = list.length;
        setHasMore(list.length === PAGE_SIZE);
      } catch {
        if (!cancelled) {
          setItems([]);
          setHasMore(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeCompanyId, canViewNotifications]);

  // Fetch the next page for the "View all" screen.
  const loadMore = useCallback(async () => {
    if (!canViewNotifications || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const list = await notificationApi.list({
        limit: PAGE_SIZE,
        offset: loadedCount.current,
      });
      const normalized = list.map(normalizeNotification);
      setItems((prev) => {
        const seen = new Set(prev.map((n) => n.id));
        return [...prev, ...normalized.filter((n) => !seen.has(n.id))];
      });
      loadedCount.current += list.length;
      setHasMore(list.length === PAGE_SIZE);
    } catch {
      // Leave hasMore as-is so the user can retry.
    } finally {
      setLoadingMore(false);
    }
  }, [canViewNotifications, loadingMore, hasMore]);

  const markRead = useCallback(async (id) => {
    if (!canViewNotifications) return;
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    try {
      await notificationApi.markRead(id);
    } catch {
      // Keep the optimistic update; next reload reconciles.
    }
  }, [canViewNotifications]);

  const markAllRead = useCallback(async () => {
    if (!canViewNotifications) return;
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await notificationApi.markAllRead();
    } catch {
      // Keep the optimistic update; next reload reconciles.
    }
  }, [canViewNotifications]);

  // Live socket subscription — prepend new notifications as they arrive and pop
  // a toast. Declared after markRead so the toast's open action can use it.
  useEffect(() => {
    if (!canViewNotifications) {
      return undefined;
    }

    let cancelled = false;
    let unsubscribe = null;

    subscribeToNotifications((payload) => {
      if (activeCompanyId && payload?.companyId && payload.companyId !== activeCompanyId) {
        return;
      }
      const incoming = normalizeNotification(payload);
      if (shownToastIds.current.has(incoming.id)) {
        return;
      }
      shownToastIds.current.add(incoming.id);

      setItems((prev) =>
        prev.some((n) => n.id === incoming.id) ? prev : [incoming, ...prev]
      );

      // A toast announcing the page you are already looking at is noise — the
      // report filling in on screen is the notification. It still goes to the
      // bell, so it is there if you leave and want it later.
      //
      // window.location rather than useLocation(): this listener is registered
      // once, and a router hook would either resubscribe on every navigation or
      // be read through a stale closure. window.location is always current.
      if (isViewingLinkTarget(incoming.link)) {
        return;
      }

      showToast({
        id: incoming.id,
        title: incoming.title,
        message: incoming.message,
        variant: incoming.variant,
        // A toast that names a finished report should be the shortest path to
        // it. Only notifications that carry a destination get one.
        onOpen: incoming.link
          ? () => {
            markRead(incoming.id);
            navigate(incoming.link);
          }
          : undefined,
      });
    })
      .then((fn) => {
        if (cancelled) fn();
        else unsubscribe = fn;
      })
      .catch(() => {
        // Socket unavailable — REST history still works.
      });

    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, [activeCompanyId, canViewNotifications, showToast, markRead, navigate]);

  const value = useMemo(
    () => ({
      items,
      groups: groupNotifications(items),
      unreadCount: countUnread(items),
      loading,
      loadingMore,
      hasMore,
      loadMore,
      markRead,
      markAllRead,
    }),
    [items, loading, loadingMore, hasMore, loadMore, markRead, markAllRead]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

NotificationProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export { NotificationProvider };
