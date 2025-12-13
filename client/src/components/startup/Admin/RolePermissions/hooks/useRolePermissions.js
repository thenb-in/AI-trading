import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { ApiService } from '../../../../../services/startup/ApiService';

function useRolePermissions() {
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

      // Find the permission object to add/remove
      const permission = permissions.find((p) => p.id === permissionId);
      if (!permission) {
        toast.error('Permission not found');
        return;
      }

      // Optimistically update the local state
      setRoles((prevRoles) =>
        prevRoles.map((role) => {
          if (role.id === selectedRoleId) {
            const currentPermissions = role.permissions || [];
            if (isAssigned) {
              // Remove permission
              return {
                ...role,
                permissions: currentPermissions.filter((p) => p.id !== permissionId),
              };
            } else {
              // Add permission
              return {
                ...role,
                permissions: [...currentPermissions, permission],
              };
            }
          }
          return role;
        })
      );

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
      } catch (err) {
        // On error, revert the optimistic update by refetching
        await fetchData();
        const errorMessage = err?.message || 'Failed to update permission';
        toast.error(errorMessage);
      } finally {
        setUpdating(false);
      }
    },
    [selectedRoleId, permissions, fetchData]
  );

  const toggleMultiplePermissions = useCallback(
    async (permissionIds, shouldAssign) => {
      if (!selectedRoleId) {
        toast.error('Please select a role first');
        return;
      }

      // Find the permission objects to add/remove
      const permissionsToToggle = permissions.filter((p) => permissionIds.includes(p.id));

      // Optimistically update the local state
      setRoles((prevRoles) =>
        prevRoles.map((role) => {
          if (role.id === selectedRoleId) {
            const currentPermissions = role.permissions || [];
            if (shouldAssign) {
              // Add permissions (avoid duplicates)
              const existingIds = new Set(currentPermissions.map((p) => p.id));
              const newPermissions = permissionsToToggle.filter((p) => !existingIds.has(p.id));
              return {
                ...role,
                permissions: [...currentPermissions, ...newPermissions],
              };
            } else {
              // Remove permissions
              return {
                ...role,
                permissions: currentPermissions.filter((p) => !permissionIds.includes(p.id)),
              };
            }
          }
          return role;
        })
      );

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
      } catch (err) {
        // On error, revert the optimistic update by refetching
        await fetchData();
        const errorMessage = err?.message || 'Failed to update permissions';
        toast.error(errorMessage);
      } finally {
        setUpdating(false);
      }
    },
    [selectedRoleId, permissions, fetchData]
  );

  const deletePermission = useCallback(
    async (permissionId) => {
      // Optimistically remove the permission from local state
      setPermissions((prevPermissions) =>
        prevPermissions.filter((p) => p.id !== permissionId)
      );

      // Also remove the permission from all roles that have it assigned
      setRoles((prevRoles) =>
        prevRoles.map((role) => {
          if (role.permissions && role.permissions.some((p) => p.id === permissionId)) {
            return {
              ...role,
              permissions: role.permissions.filter((p) => p.id !== permissionId),
            };
          }
          return role;
        })
      );

      setUpdating(true);
      try {
        const response = await ApiService.deletePermission(permissionId);
        if (response.data?.success) {
          toast.success(response.data.message || 'Permission deleted successfully');
        } else {
          // On error, revert by refetching
          await fetchData();
          toast.error(response.data?.message || 'Failed to delete permission');
        }
      } catch (err) {
        // On error, revert by refetching
        await fetchData();
        const errorMessage = err?.message || err?.data?.message || 'Failed to delete permission';
        toast.error(errorMessage);
      } finally {
        setUpdating(false);
      }
    },
    [fetchData]
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
    deletePermission,
    refetch: fetchData,
  };
}

export { useRolePermissions };
