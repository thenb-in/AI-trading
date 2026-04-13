import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { ApiService } from '@services/startup/ApiService';

function useSubscriptions() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [subscriptionsResponse, permissionsResponse] = await Promise.all([
        ApiService.getSubscriptions(),
        ApiService.getPermissions(),
      ]);

      const subscriptionsData = subscriptionsResponse.data?.data || subscriptionsResponse.data || [];
      const permissionsData = permissionsResponse.data?.data || permissionsResponse.data || [];

      setSubscriptions(subscriptionsData);
      setPermissions(permissionsData);

      // Reset selected subscription if it's not in the new list, or auto-select first if none selected
      setSelectedSubscriptionId((prevSelectedSubscriptionId) => {
        // If previously selected subscription is not in new list, clear selection
        if (prevSelectedSubscriptionId && !subscriptionsData.find(s => s.id === prevSelectedSubscriptionId)) {
          return null;
        }
        
        // Auto-select first subscription if none selected
        if (!prevSelectedSubscriptionId && subscriptionsData.length > 0) {
          return subscriptionsData[0].id;
        }
        
        // Keep current selection
        return prevSelectedSubscriptionId;
      });
    } catch (err) {
      const errorMessage = err?.message || 'Failed to fetch subscriptions and permissions';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const selectedSubscription = subscriptions.find((s) => s.id === selectedSubscriptionId) || null;

  const isValidStatusUpdate = useCallback(
    (status) => {
      if (!selectedSubscriptionId) {
        toast.error('Please select a subscription first');
        return false;
      }
      if (!['subscribed', 'not_subscribed', 'hidden'].includes(status)) {
        toast.error('Invalid status');
        return false;
      }
      return true;
    },
    [selectedSubscriptionId]
  );

  const updatePermissionStatus = useCallback(
    async (permission_id, status) => {
      if (!isValidStatusUpdate(status)) return;

      // Optimistically update the local state
      setSubscriptions((prevSubscriptions) =>
        prevSubscriptions.map((subscription) => {
          if (subscription.id === selectedSubscriptionId) {
            const currentPermissions = subscription.permissions || [];
            const permissionIndex = currentPermissions.findIndex((p) => p.id === permission_id);
            
            if (permissionIndex >= 0) {
              // Update existing permission status
              const updatedPermissions = [...currentPermissions];
              updatedPermissions[permissionIndex] = {
                ...updatedPermissions[permissionIndex],
                subscriptionStatus: status
              };
              return {
                ...subscription,
                permissions: updatedPermissions
              };
            } else {
              // Add new permission with status
              const permission = permissions.find((p) => p.id === permission_id);
              if (permission) {
                return {
                  ...subscription,
                  permissions: [...currentPermissions, { ...permission, subscriptionStatus: status }]
                };
              }
            }
          }
          return subscription;
        })
      );

      setUpdating(true);
      try {
        await ApiService.updateSubscriptionPermissionStatus({
          subscription_id: selectedSubscriptionId,
          permission_id,
          status
        });
        toast.success('Permission status updated successfully');
      } catch (err) {
        // On error, revert the optimistic update by refetching
        await fetchData();
        const errorMessage = err?.message || 'Failed to update permission status';
        toast.error(errorMessage);
      } finally {
        setUpdating(false);
      }
    },
    [isValidStatusUpdate, selectedSubscriptionId, permissions, fetchData]
  );

  const updateMultiplePermissionStatuses = useCallback(
    async (permission_ids, status) => {
      if (!isValidStatusUpdate(status)) return;

      // Optimistically update the local state
      setSubscriptions((prevSubscriptions) =>
        prevSubscriptions.map((subscription) => {
          if (subscription.id === selectedSubscriptionId) {
            const currentPermissions = subscription.permissions || [];
            const updatedPermissions = currentPermissions.map((p) => {
              if (permission_ids.includes(p.id)) {
                return {
                  ...p,
                  subscriptionStatus: status
                };
              }
              return p;
            });

            // Add any missing permissions
            const existingIds = new Set(currentPermissions.map((p) => p.id));
            const newPermissions = permissions
              .filter((p) => permission_ids.includes(p.id) && !existingIds.has(p.id))
              .map((p) => ({ ...p, subscriptionStatus: status }));

            return {
              ...subscription,
              permissions: [...updatedPermissions, ...newPermissions]
            };
          }
          return subscription;
        })
      );

      setUpdating(true);
      try {
        await ApiService.updateMultipleSubscriptionPermissionStatuses({
          subscription_id: selectedSubscriptionId,
          permission_ids,
          status
        });
        toast.success(`${permission_ids.length} permission(s) updated successfully`);
      } catch (err) {
        // On error, revert the optimistic update by refetching
        await fetchData();
        const errorMessage = err?.message || 'Failed to update permission statuses';
        toast.error(errorMessage);
      } finally {
        setUpdating(false);
      }
    },
    [isValidStatusUpdate, selectedSubscriptionId, permissions, fetchData]
  );

  return {
    subscriptions,
    permissions,
    selectedSubscriptionId,
    selectedSubscription,
    loading,
    error,
    updating,
    setSelectedSubscriptionId,
    updatePermissionStatus,
    updateMultiplePermissionStatuses,
    refetch: fetchData,
  };
}

export { useSubscriptions };

