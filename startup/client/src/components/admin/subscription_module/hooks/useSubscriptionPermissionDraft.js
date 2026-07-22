import { useState, useCallback, useMemo } from 'react';

const DEFAULT_STATUS = 'not_subscribed';


function buildStatusMap(savedPermissions) {
  const map = {};
  (savedPermissions || []).forEach((p) => {
    map[p.id] = p.subscriptionStatus || DEFAULT_STATUS;
  });
  return map;
}


function useSubscriptionPermissionDraft(initialPermissions = []) {
  const [baseMap, setBaseMap] = useState(() => buildStatusMap(initialPermissions));
  const [draftMap, setDraftMap] = useState(() => buildStatusMap(initialPermissions));

  const reset = useCallback((savedPermissions) => {
    const map = buildStatusMap(savedPermissions);
    setBaseMap(map);
    setDraftMap(map);
  }, []);

  const setStatus = useCallback((permissionId, status) => {
    setDraftMap((prev) => ({ ...prev, [permissionId]: status }));
  }, []);

  const setMany = useCallback((permissionIds, status) => {
    setDraftMap((prev) => {
      const next = { ...prev };
      permissionIds.forEach((id) => { next[id] = status; });
      return next;
    });
  }, []);

  const getStatus = useCallback(
    (permissionId) => draftMap[permissionId] || DEFAULT_STATUS,
    [draftMap]
  );

  // Only the permissions whose status differs from the last-saved value.
  const changedRows = useMemo(() => {
    const rows = [];
    const ids = new Set([...Object.keys(baseMap), ...Object.keys(draftMap)]);
    ids.forEach((idStr) => {
      const permission_id = Number(idStr);
      const base = baseMap[permission_id] || DEFAULT_STATUS;
      const current = draftMap[permission_id] || DEFAULT_STATUS;
      if (current !== base) {
        rows.push({ permission_id, status: current });
      }
    });
    return rows;
  }, [baseMap, draftMap]);

  return {
    getStatus,
    setStatus,
    setMany,
    reset,
    changedRows,
    dirtyCount: changedRows.length,
  };
}

export { useSubscriptionPermissionDraft };
