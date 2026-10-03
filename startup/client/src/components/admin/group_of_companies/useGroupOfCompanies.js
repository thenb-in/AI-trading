import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { groupOfCompaniesService } from '@services/groupOfCompaniesService';
import { getApiErrorMessage } from '@utils/apiErrorMessage';

const useGroupOfCompanies = () => {
  const [groups, setGroups] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await groupOfCompaniesService.list();
      setGroups(res?.data?.data?.groupOfCompanies || []);
    } catch (e) {
      toast.error(getApiErrorMessage(e, 'Failed to load groups of companies'));
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchOptions = useCallback(async () => {
    try {
      const res = await groupOfCompaniesService.options();
      setCompanies(res?.data?.data?.companies || []);
    } catch (e) {
      toast.error(getApiErrorMessage(e, 'Failed to load companies'));
    }
  }, []);

  useEffect(() => {
    fetchGroups();
    fetchOptions();
  }, [fetchGroups, fetchOptions]);

  const saveGroup = useCallback(async (id, payload) => {
    setSaving(true);
    try {
      const res = id
        ? await groupOfCompaniesService.update(id, payload)
        : await groupOfCompaniesService.create(payload);
      toast.success(res?.data?.message || 'Group saved');
      await fetchGroups();
      return true;
    } catch (e) {
      toast.error(getApiErrorMessage(e, 'Failed to save group'));
      return false;
    } finally {
      setSaving(false);
    }
  }, [fetchGroups]);

  const removeGroup = useCallback(async (group) => {
    try {
      const res = await groupOfCompaniesService.remove(group.id);
      toast.success(res?.data?.message || `Group "${group.name}" deleted`);
      await fetchGroups();
    } catch (e) {
      toast.error(getApiErrorMessage(e, 'Failed to delete group'));
    }
  }, [fetchGroups]);

  return { groups, companies, loading, saving, saveGroup, removeGroup };
};

export { useGroupOfCompanies };
