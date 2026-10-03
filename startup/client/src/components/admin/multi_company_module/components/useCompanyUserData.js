import { useState, useEffect, useCallback } from 'react';
import { ApiService } from '@services/ApiService';
import { toast } from 'react-toastify';

// Normalize API response to array
const normalizeArray = (responseData) => {
  if (Array.isArray(responseData)) return responseData;
  if (responseData?.data && Array.isArray(responseData.data)) return responseData.data;
  return [];
};

// Custom hook for managing company user assignment data: who is already
// assigned, and who may be assigned (support users and the company's group
// business users).
const useCompanyUserData = (isOpen, initialCompany) => {
  const [data, setData] = useState({
    companyUsers: [],
    supportUsers: [],
    businessUsers: [],
    loading: false
  });

  const companyId = initialCompany?.id;

  const loadData = useCallback(async () => {
    if (!companyId) {
      setData({ companyUsers: [], supportUsers: [], businessUsers: [], loading: false });
      return;
    }
    setData(prev => ({ ...prev, loading: true }));
    try {
      const [assignedRes, assignableRes] = await Promise.all([
        ApiService.getCompanyUsers(companyId),
        ApiService.getAssignableUsers(companyId)
      ]);
      const assignable = assignableRes.data?.data || {};
      setData({
        companyUsers: normalizeArray(assignedRes.data),
        supportUsers: Array.isArray(assignable.supportUsers) ? assignable.supportUsers : [],
        businessUsers: Array.isArray(assignable.businessUsers) ? assignable.businessUsers : [],
        loading: false
      });
    } catch (error) {
      toast.error(error?.message || 'Failed to load data');
      setData(prev => ({ ...prev, loading: false }));
    }
  }, [companyId]);

  const loadCompanyUsers = useCallback(async () => {
    if (!companyId) return;
    try {
      const response = await ApiService.getCompanyUsers(companyId);
      setData(prev => ({ ...prev, companyUsers: normalizeArray(response.data) }));
    } catch (error) {
      toast.error(error?.message || 'Failed to load company users');
    }
  }, [companyId]);

  useEffect(() => {
    if (isOpen) loadData();
  }, [isOpen, loadData]);

  return { ...data, loadCompanyUsers };
};

export { useCompanyUserData };
