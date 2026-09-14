import { useState, useEffect, useCallback } from 'react';
import { ApiService } from '@services/ApiService';
import { toast } from 'react-toastify';

// Custom hook for managing company user assignment data
const useCompanyUserData = (isOpen, initialCompany) => {
  const [data, setData] = useState({
    companyUsers: [],
    loading: false
  });

  // Normalize API response to array
  const normalizeResponse = (responseData) => {
    if (Array.isArray(responseData)) return responseData;
    if (responseData?.data && Array.isArray(responseData.data)) return responseData.data;
    return [];
  };

  const loadData = useCallback(async () => {
    setData(prev => ({ ...prev, loading: true }));

    try {
      const companyUsersRes = initialCompany?.id ? await ApiService.getCompanyUsers(initialCompany.id) : { data: [] };

      setData({
        companyUsers: normalizeResponse(companyUsersRes.data),
        loading: false
      });
    } catch (error) {
      toast.error(error?.message || 'Failed to load data');
      setData(prev => ({ ...prev, loading: false }));
    }
  }, [initialCompany?.id]);

  const loadCompanyUsers = useCallback(async (companyId) => {
    try {
      const response = await ApiService.getCompanyUsers(companyId);
      setData(prev => ({
        ...prev,
        companyUsers: normalizeResponse(response.data)
      }));
    } catch (error) {
      toast.error(error?.message || 'Failed to load company users');
    }
  }, []);

  useEffect(() => {
    if (isOpen) loadData();
  }, [isOpen, loadData]);

  return { ...data, loadCompanyUsers };
};

export { useCompanyUserData };


