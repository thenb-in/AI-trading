import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { useDataContext } from "@context/useDataContext";
import { useToast } from "../components/toast";
import { NotificationContext } from "./NotificationContext";
import { notificationApi } from "./notificationApi";
import { subscribeToNotifications } from "./notificationSocket";
import { normalizeNotification } from "./notificationFormat";
import { countUnread, groupNotifications } from "./notificationUtils";

const PAGE_SIZE = 20;


function NotificationProvider({ children }) {
  const { userData } = useDataContext();
  const { showToast } = useToast();
  const activeCompanyId = userData?.companyId || userData?.company?.id || null;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const loadedCount = useRef(0);
  const shownToastIds = useRef(new Set());

  // Initial history load for the active company.
  useEffect(() => {
    if (!activeCompanyId) {
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
  }, [activeCompanyId]);

  // Live socket subscription — prepend new notifications as they arrive.
  useEffect(() => {
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
      showToast({
        id: incoming.id,
        title: incoming.title,
        message: incoming.message,
        variant: incoming.variant,
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
  }, [activeCompanyId, showToast]);

  // Fetch the next page for the "View all" screen.
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
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
  }, [loadingMore, hasMore]);

  const markRead = useCallback(async (id) => {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    try {
      await notificationApi.markRead(id);
    } catch {
      // Keep the optimistic update; next reload reconciles.
    }
  }, []);

  const markAllRead = useCallback(async () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await notificationApi.markAllRead();
    } catch {
      // Keep the optimistic update; next reload reconciles.
    }
  }, []);

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
