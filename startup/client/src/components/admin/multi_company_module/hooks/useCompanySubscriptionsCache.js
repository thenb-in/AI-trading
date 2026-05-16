import { useRef, useCallback, useState } from 'react';
import { ApiService } from '@services/ApiService';

/**
 * Shared cache for company subscription data.
 * Fetches only on demand (e.g. when a selector is opened) to avoid N API calls
 * when debug mode lists all companies.
 */
const useCompanySubscriptionsCache = () => {
  const companySubsCacheRef = useRef(new Map());
  const availableSubsRef = useRef(null);
  const availableFetchRef = useRef(null);
  const [availableSubscriptions, setAvailableSubscriptions] = useState([]);

  const ensureAvailableSubscriptions = useCallback(async () => {
    if (availableSubsRef.current) {
      return availableSubsRef.current;
    }
    if (!availableFetchRef.current) {
      availableFetchRef.current = ApiService.getAvailableSubscriptions()
        .then((response) => {
          const subs = response?.data?.data || [];
          availableSubsRef.current = subs;
          setAvailableSubscriptions(subs);
          return subs;
        })
        .catch((error) => {
          availableFetchRef.current = null;
          throw error;
        });
    }
    return availableFetchRef.current;
  }, []);

  const getCompanySubscriptionIds = useCallback(async (companyId) => {
    if (!companyId) return [];
    if (companySubsCacheRef.current.has(companyId)) {
      return companySubsCacheRef.current.get(companyId);
    }
    const companyRes = await ApiService.getCompanySubscriptions(companyId);
    const companySubs = companyRes?.data?.data || [];
    const ids = companySubs.map((s) => s.id);
    companySubsCacheRef.current.set(companyId, ids);
    return ids;
  }, []);

  const setCompanySubscriptionIds = useCallback((companyId, ids) => {
    if (companyId) {
      companySubsCacheRef.current.set(companyId, ids);
    }
  }, []);

  const invalidateCompany = useCallback((companyId) => {
    if (companyId) {
      companySubsCacheRef.current.delete(companyId);
    }
  }, []);

  return {
    availableSubscriptions,
    ensureAvailableSubscriptions,
    getCompanySubscriptionIds,
    setCompanySubscriptionIds,
    invalidateCompany,
  };
};

export { useCompanySubscriptionsCache };
