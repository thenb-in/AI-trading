import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { toast } from 'react-toastify';
import { activityService } from '@services/activityService';
import { ActivityChangesTable } from './ActivityChangesTable';
import {formatDateTime} from '@utils/dateTimeUtils'
import { getApiErrorMessage } from '@utils/apiErrorMessage';

const parseLog = (log) => {
  if (!log) return null;
  try {
    return typeof log === 'string' ? JSON.parse(log) : log;
  } catch {
    return null;
  }
};
const actionBadgeClasses = (action) => {
  switch (action) {
    case 'CREATE':
      return 'bg-green-50 text-green-700 border-green-200';
    case 'UPDATE':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'DELETE':
      return 'bg-red-50 text-red-700 border-red-200';
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200';
  }
};

const AuditTimeline = ({ head, objectId, pageSize = 25 }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const scrollRootRef = useRef(null);
  const loadMoreRef = useRef(null);

  const safeObjectId = objectId === undefined || objectId === null ? null : String(objectId);

  const loadFirstPage = useCallback(async () => {
    if (!head || safeObjectId === null) return;
    setLoading(true);
    setActivities([]);
    setExpandedId(null);
    setHasMore(false);

    try {
      const response = await activityService.getActivitiesByHeadAndObjectId(head, safeObjectId, pageSize, 0);
      const rows = Array.isArray(response?.data) ? response.data : [];
      setActivities(rows);
      setHasMore(rows.length === pageSize);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to load audit history'));
    } finally {
      setLoading(false);
    }
  }, [head, pageSize, safeObjectId]);

  useEffect(() => {
    void loadFirstPage();
  }, [loadFirstPage]);

  const handleLoadMore = useCallback(async () => {
    if (loadingMore) return;
    if (!head || safeObjectId === null) return;
    if (!hasMore) return;

    setLoadingMore(true);
    try {
      const offset = activities.length;
      const response = await activityService.getActivitiesByHeadAndObjectId(head, safeObjectId, pageSize, offset);
      const rows = Array.isArray(response?.data) ? response.data : [];

      setActivities((prev) => [...prev, ...rows]);
      setHasMore(rows.length === pageSize);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to load more audit history'));
    } finally {
      setLoadingMore(false);
    }
  }, [activities.length, hasMore, head, loadingMore, pageSize, safeObjectId]);

  useEffect(() => {
    if (loading) return;
    if (loadingMore) return;
    if (!hasMore) return;
    if (!scrollRootRef.current) return;
    if (!loadMoreRef.current) return;

    const root = scrollRootRef.current;
    const node = loadMoreRef.current;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first?.isIntersecting) return;
        void handleLoadMore();
      },
      { root, rootMargin: '200px', threshold: 0.1 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [handleLoadMore, hasMore, loading, loadingMore]);

  const parsedActivities = useMemo(() => {
    return activities.map((activity) => {
      const parsedLogValue = parseLog(activity.log);
      const action = parsedLogValue?.action || activity.type || null;
      return { ...activity, parsedLogValue, action };
    });
  }, [activities]);

  if (!head || safeObjectId === null) return null;

  return (
    <section className="mt-2">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="text-sm font-semibold text-gray-800">Audit Timeline</h3>
        <div className="text-xs text-gray-500">
          Record ID: <span className="font-medium text-gray-700">{safeObjectId}</span>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-gray-600">Loading audit history...</div>
      ) : parsedActivities.length === 0 ? (
        <div className="text-sm text-gray-500">No audit history found for this record.</div>
      ) : (
        <div ref={scrollRootRef} className="relative pl-6 max-h-80 overflow-y-auto pr-2">
          <div className="absolute left-2 top-0 h-full w-px bg-gray-200" />

          {parsedActivities.map((activity) => {
            const isExpanded = String(expandedId) === String(activity.id);
            const action = activity.action;
            const badgeClass = actionBadgeClasses(action);
            const parsedLogValue = activity.parsedLogValue;
            const changes = parsedLogValue?.changes || null;
            const createdIds = parsedLogValue?.createdIds;
            const deletedIds = parsedLogValue?.deletedIds;

            return (
              <div key={activity.id} className="relative mb-4">
                <span className="absolute left-1.5 top-4 h-3 w-3 rounded-full bg-white border-2 border-blue-500" />

                <div className="ml-2 bg-white border border-gray-200 rounded-lg p-3">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 text-xs border rounded ${badgeClass}`}>
                        {action || '-'}
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {activity.objectName || parsedLogValue?.objectName || 'Record'}
                      </span>
                    </div>

                    <div className="text-xs text-gray-500">
                      {formatDateTime(activity.createdAt)}
                    </div>
                  </div>

                  <div className="mt-1 text-xs text-gray-600">
                    Audit By: <span className="font-medium text-gray-800">{activity.createdByName || '-'}</span>
                  </div>

                  {Array.isArray(createdIds) && createdIds.length > 0 && (
                    <div className="mt-2 text-xs text-gray-700">
                      Created IDs: <span className="font-medium text-gray-900">{createdIds.join(', ')}</span>
                    </div>
                  )}

                  {Array.isArray(deletedIds) && deletedIds.length > 0 && (
                    <div className="mt-2 text-xs text-gray-700">
                      Deleted IDs: <span className="font-medium text-gray-900">{deletedIds.join(', ')}</span>
                    </div>
                  )}

                  {action === 'UPDATE' && changes && Object.keys(changes).length > 0 && (
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : activity.id)}
                        className="text-xs font-medium text-blue-700 hover:text-blue-800"
                      >
                        {isExpanded ? 'Hide changes' : `View changes (${Object.keys(changes).length})`}
                      </button>
                    </div>
                  )}

                  {isExpanded && action === 'UPDATE' && changes && (
                    <ActivityChangesTable changes={changes} />
                  )}
                </div>
              </div>
            );
          })}

          {/* Sentinel for infinite scroll */}
          <div ref={loadMoreRef} className="h-8" />
        </div>
      )}

      {!loading && parsedActivities.length > 0 && (
        <div className="mt-2 text-xs text-gray-400">
          {loadingMore ? 'Loading more…' : hasMore ? 'Scroll to load more' : 'End of audit history'}
        </div>
      )}
    </section>
  );
};

AuditTimeline.propTypes = {
  head: PropTypes.string.isRequired,
  objectId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  pageSize: PropTypes.number
};

export { AuditTimeline };

