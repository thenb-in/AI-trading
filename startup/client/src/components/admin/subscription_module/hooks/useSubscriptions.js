import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { ApiService } from '@services/ApiService';

function useSubscriptions() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  const selectedSubscription = subscriptions.find(
    (s) => String(s.id) === String(selectedSubscriptionId)
  ) || null;

  return {
    subscriptions,
    permissions,
    selectedSubscriptionId,
    selectedSubscription,
    loading,
    error,
    setSelectedSubscriptionId,
    refetch: fetchData,
  };
}

export { useSubscriptions };

