import { useState, useEffect, useCallback } from 'react';
import ApiService from '../../../../services/ApiService';

export const useRolePermissions = () => {
  const [roles, setRoles] = useState([]);
  const [allPermissions, setAllPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const [rolesResponse, permissionsResponse] = await Promise.all([
        ApiService.getRoles(),
        ApiService.getPermissions()
      ]);

      if (rolesResponse.data?.success !== false) {
        const rolesData = rolesResponse.data?.data || rolesResponse.data || [];
        setRoles(Array.isArray(rolesData) ? rolesData : []);
      } else {
        throw new Error(rolesResponse.data?.message || 'Failed to fetch roles');
      }

      if (permissionsResponse.data?.success !== false) {
        const permissionsData = permissionsResponse.data?.data || permissionsResponse.data || [];
        setAllPermissions(Array.isArray(permissionsData) ? permissionsData : []);
      } else {
        throw new Error(permissionsResponse.data?.message || 'Failed to fetch permissions');
      }

      setRetryCount(0); // Reset retry count on success
    } catch (err) {
      console.error('Error fetching data:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load roles and permissions';
      setError(errorMessage);
      
      // Auto-retry logic for network errors
      if (retryCount < 3 && (err.code === 'NETWORK_ERROR' || !err.response)) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          fetchData();
        }, 2000 * (retryCount + 1)); // Exponential backoff
      }
    } finally {
      setLoading(false);
    }
  }, [retryCount]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addPermissionsToRole = async (roleId, permissionIds) => {
    try {
      const response = await ApiService.addRolePermissions({
        roleId: parseInt(roleId),
        permissionIds: permissionIds
      });

      const responseData = response.data || response;
      if (responseData.success !== false) {
        setSuccess(responseData.message || 'Permissions added successfully!');
        // Refresh data
        await fetchData();
        return { success: true, message: responseData.message };
      } else {
        throw new Error(responseData.message || 'Failed to add permissions');
      }
    } catch (err) {
      console.error('Error adding permissions:', err);
      const errorMessage = err.response?.data?.message || err.message || 'An error occurred while adding permissions';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    }
  };

  const removePermissionFromRole = async (roleId, permissionId) => {
    try {
      const response = await ApiService.removeRolePermission({
        roleId,
        permissionId
      });

      const responseData = response.data || response;
      if (responseData.success !== false) {
        setSuccess(responseData.message || 'Permission removed successfully!');
        // Refresh data
        await fetchData();
        return { success: true, message: responseData.message };
      } else {
        throw new Error(responseData.message || 'Failed to remove permission');
      }
    } catch (err) {
      console.error('Error removing permission:', err);
      const errorMessage = err.response?.data?.message || err.message || 'An error occurred while removing permission';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    }
  };

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  return {
    // Data
    roles,
    allPermissions,
    loading,
    error,
    success,
    retryCount,
    
    // Actions
    fetchData,
    addPermissionsToRole,
    removePermissionFromRole,
    clearMessages,
    
    // Setters
    setError,
    setSuccess
  };
};
