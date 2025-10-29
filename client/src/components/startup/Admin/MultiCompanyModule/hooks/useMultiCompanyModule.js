import { useCallback, useEffect, useMemo, useState } from 'react';
import ApiService from '../../../../../services/startup/ApiService';
import { STORAGE_KEYS } from '../../../../../constants/startup/index';
import { useDataContext } from '../../../../../context/startup/useDataContext';

export const useMultiCompanyModule = () => {
  const { userData, setUserData } = useDataContext();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);

  const activeCompanyId = useMemo(() => userData?.companyId || userData?.company?.id || null, [userData]);
  // Extract localStorage value to a variable for useMemo dependency
  const activeCompanyNameFromStorage = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.ACTIVE_COMPANY_NAME) : null;
  const activeCompanyName = useMemo(() => {
    // Prefer server/userData source; fallback to localStorage if missing
    return activeCompanyNameFromStorage || null;
  }, [activeCompanyNameFromStorage]);

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await ApiService.getUserCompanies();
      const list = res?.data?.companies || [];
      // Sort companies alphabetically by name
      const sortedCompanies = list.sort((a, b) => {
        const nameA = (a.name || '').toLowerCase();
        const nameB = (b.name || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
      setCompanies(sortedCompanies);
    } catch (e) {
      console.log(e)
      setError(e?.message || 'Failed to load companies');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const handleCreate = useCallback(async (payload) => {
    if (!payload?.name || !payload.name.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      await ApiService.request('POST', '/company', payload);
      await fetchCompanies();
    } catch (e) {
      setCreateError(e?.error || 'Failed to create company');
    } finally {
      setCreating(false);
    }
  }, [fetchCompanies]);

  const handleSwitch = useCallback(async (companyId) => {
    // if (!companyId || companyId === activeCompanyId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await ApiService.switchCompany(companyId);
      setUserData(prev => ({
        ...prev,
        companyId: response.data.updatedUser.companyId,
        company: response.data.updatedUser.company
      }));
      // Persist active company name for fallback display
      if (response?.data?.updatedUser?.company?.name && typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_COMPANY_NAME, response.data.updatedUser.company.name);
      }
      await fetchCompanies();
    } catch (e) {
      setError(e?.error || 'Failed to switch company');
    } finally {
      setLoading(false);
    }
  }, [activeCompanyId, fetchCompanies, setUserData]);

  return {
    companies,
    activeCompanyId,
    activeCompanyName,
    loading,
    error,
    creating,
    createError,
    fetchCompanies,
    handleCreate,
    handleSwitch,
  };
};


