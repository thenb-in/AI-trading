import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { ApiService } from '@services/ApiService';
import { useDataContext } from '@context/useDataContext';

function useRolePermissions() {
  const { userData } = useDataContext();
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [companySubscriptions, setCompanySubscriptions] = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const companyId = userData?.companyId || userData?.company?.id;
      
      const promises = [
        ApiService.getRoles(),
        ApiService.getPermissions(),
      ];

      // Fetch company subscriptions if companyId is available
      if (companyId) {
        promises.push(ApiService.getCompanySubscriptions(companyId));
      }

      const responses = await Promise.all(promises);
      const rolesResponse = responses[0];
      const permissionsResponse = responses[1];
      const subscriptionsResponse = companyId ? responses[2] : null;

      const rolesData = rolesResponse.data?.data || rolesResponse.data || [];
      const permissionsData = permissionsResponse.data?.data || permissionsResponse.data || [];
      const subscriptionsData = subscriptionsResponse?.data?.data || subscriptionsResponse?.data || [];

      setRoles(rolesData);
      setPermissions(permissionsData);
      setCompanySubscriptions(subscriptionsData || []);

      // Reset selected role if it's not in the new list, or auto-select first if none selected
      setSelectedRoleId((prevSelectedRoleId) => {
        // If previously selected role is not in new list, clear selection
        if (prevSelectedRoleId && !rolesData.find(r => r.id === prevSelectedRoleId)) {
          return null;
        }
        
        // Auto-select first role if none selected
        if (!prevSelectedRoleId && rolesData.length > 0) {
          return rolesData[0].id;
        }
        
        // Keep current selection
        return prevSelectedRoleId;
      });
    } catch (err) {
      const errorMessage = err?.message || 'Failed to fetch roles and permissions';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [userData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const selectedRole = roles.find((r) => r.id === selectedRoleId) || null;

  // The picker works in string ids; this screen's roles are keyed numerically.
  // It can also hand back a role it created itself, which this screen has not
  // loaded — catch up rather than show an empty permission panel.
  const selectRole = useCallback(
    (roleId) => {
      const id = roleId ? Number(roleId) : null;
      setSelectedRoleId(id);
      if (id && !roles.some((role) => role.id === id)) fetchData();
    },
    [roles, fetchData]
  );

  const togglePermission = useCallback(
    async (permission_id, isAssigned) => {
      if (!selectedRoleId) {
        toast.error('Please select a role first');
        return;
      }

      // Find the permission object to add/remove
      const permission = permissions.find((p) => p.id === permission_id);
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
                permissions: currentPermissions.filter((p) => p.id !== permission_id),
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
            role_id: selectedRoleId,
            permission_id,
          });
          toast.success('Permission removed successfully');
        } else {
          // Add permission (linked permissions have the same ID, so adding one adds all)
          await ApiService.addRolePermissions({
            role_id: selectedRoleId,
            permission_ids: [permission_id],
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
    async (permission_ids, shouldAssign) => {
      if (!selectedRoleId) {
        toast.error('Please select a role first');
        return;
      }

      // Find the permission objects to add/remove
      const permissionsToToggle = permissions.filter((p) => permission_ids.includes(p.id));

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
                permissions: currentPermissions.filter((p) => !permission_ids.includes(p.id)),
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
            role_id: selectedRoleId,
            permission_ids,
          });
          toast.success(`${permission_ids.length} permission(s) added successfully`);
        } else {
          // Remove permissions one by one (API might not support bulk remove)
          const promises = permission_ids.map((permission_id) =>
            ApiService.removeRolePermission({
              role_id: selectedRoleId,
              permission_id,
            })
          );
          await Promise.all(promises);
          toast.success(`${permission_ids.length} permission(s) removed successfully`);
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

  // Deleting the permissions no constant declares — one from a module chip, or
  // a whole master's worth from its row header. Whatever the server refuses
  // comes back on the refetch, so nothing has to be put back by hand here.
  const deletePermissions = useCallback(
    async (permission_ids) => {
      // Optimistically remove them, and drop them from every role holding them
      setPermissions((prevPermissions) =>
        prevPermissions.filter((p) => !permission_ids.includes(p.id))
      );

      setRoles((prevRoles) =>
        prevRoles.map((role) => ({
          ...role,
          permissions: (role.permissions || []).filter((p) => !permission_ids.includes(p.id)),
        }))
      );

      setUpdating(true);
      try {
        await Promise.all(permission_ids.map((permission_id) => ApiService.deletePermission(permission_id)));
        toast.success(`${permission_ids.length} permission(s) deleted successfully`);
      } catch (err) {
        // On error, revert by refetching
        await fetchData();
        const errorMessage = err?.message || err?.data?.message || 'Failed to delete permissions';
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
    companySubscriptions,
    selectedRoleId,
    selectedRole,
    loading,
    error,
    updating,
    selectRole,
    togglePermission,
    toggleMultiplePermissions,
    deletePermissions,
    refetch: fetchData,
  };
}

export { useRolePermissions };
