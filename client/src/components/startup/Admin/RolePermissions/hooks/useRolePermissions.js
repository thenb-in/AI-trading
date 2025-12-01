import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { ApiService } from '../../../../../services/startup/ApiService';

export function useRolePermissions() {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rolesResponse, permissionsResponse] = await Promise.all([
        ApiService.getRoles(),
        ApiService.getPermissions(),
      ]);

      const rolesData = rolesResponse.data?.data || rolesResponse.data || [];
      const permissionsData = permissionsResponse.data?.data || permissionsResponse.data || [];

      setRoles(rolesData);
      setPermissions(permissionsData);

      // Auto-select first role if none selected
      if (!selectedRoleId && rolesData.length > 0) {
        setSelectedRoleId(rolesData[0].id);
      }
    } catch (err) {
      const errorMessage = err?.message || 'Failed to fetch roles and permissions';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [selectedRoleId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const selectedRole = roles.find((r) => r.id === selectedRoleId) || null;

  const togglePermission = useCallback(
    async (permissionId, isAssigned) => {
      if (!selectedRoleId) {
        toast.error('Please select a role first');
        return;
      }

      setUpdating(true);
      try {
        // Note: Linked permissions share the same ID (they're the same permission object
        // displayed in multiple places), so toggling by ID automatically syncs all instances
        if (isAssigned) {
          // Remove permission (linked permissions have the same ID, so removing one removes all)
          await ApiService.removeRolePermission({
            roleId: selectedRoleId,
            permissionId,
          });
          toast.success('Permission removed successfully');
        } else {
          // Add permission (linked permissions have the same ID, so adding one adds all)
          await ApiService.addRolePermissions({
            roleId: selectedRoleId,
            permissionIds: [permissionId],
          });
          toast.success('Permission added successfully');
        }

        // Refresh data
        await fetchData();
      } catch (err) {
        const errorMessage = err?.message || 'Failed to update permission';
        toast.error(errorMessage);
      } finally {
        setUpdating(false);
      }
    },
    [selectedRoleId, fetchData]
  );

  const toggleMultiplePermissions = useCallback(
    async (permissionIds, shouldAssign) => {
      if (!selectedRoleId) {
        toast.error('Please select a role first');
        return;
      }

      setUpdating(true);
      try {
        if (shouldAssign) {
          // Add permissions
          await ApiService.addRolePermissions({
            roleId: selectedRoleId,
            permissionIds,
          });
          toast.success(`${permissionIds.length} permission(s) added successfully`);
        } else {
          // Remove permissions one by one (API might not support bulk remove)
          const promises = permissionIds.map((permissionId) =>
            ApiService.removeRolePermission({
              roleId: selectedRoleId,
              permissionId,
            })
          );
          await Promise.all(promises);
          toast.success(`${permissionIds.length} permission(s) removed successfully`);
        }

        // Refresh data
        await fetchData();
      } catch (err) {
        const errorMessage = err?.message || 'Failed to update permissions';
        toast.error(errorMessage);
      } finally {
        setUpdating(false);
      }
    },
    [selectedRoleId, fetchData]
  );

  return {
    roles,
    permissions,
    selectedRoleId,
    selectedRole,
    loading,
    error,
    updating,
    setSelectedRoleId,
    togglePermission,
    toggleMultiplePermissions,
    refetch: fetchData,
  };
}
