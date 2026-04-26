import { useState, useEffect, useMemo } from "react";
import { ApiService } from "@services/ApiService";

const INITIAL_CONFIRM_DIALOG = { show: false, userId: null, action: null, username: "", userRole: null };

const useUserManagement = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmDialog, setConfirmDialog] = useState(INITIAL_CONFIRM_DIALOG);
  const [bulkDeleteMode, setBulkDeleteMode] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState({
    show: false,
    selectedUsers: [],
  });
  const fetchData = async () => {
    try {
      setLoading(true);
      const usersResponse = await ApiService.getAllUsers();
      setUsers(usersResponse.data.users);
      setRoles(usersResponse.data.roles);
      setError("");
    } catch (err) {
      setError(err.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (error) {
      const timeout = setTimeout(() => {
        setError("");
      }, 3000); // 3 seconds

      return () => clearTimeout(timeout);
    }
  }, [error]);
  const handleApprove = async (userId, requirePasswordReset = false, roleId = null) => {
    try {
      await ApiService.approveUser(userId, requirePasswordReset, roleId);
      setUsers(
        users.map((user) => {
          if (user.id === userId) {
            const updatedUser = { ...user, is_approved: true };
            // If roleId was provided, update the role in the user object
            if (roleId) {
              const newRole = roles.find((role) => role.id === roleId);
              updatedUser.role = newRole || null;
            }
            return updatedUser;
          }
          return user;
        })
      );
      setError("");
    } catch (err) {
      setError(err.message || "Failed to approve user");
    } finally {
      setConfirmDialog(INITIAL_CONFIRM_DIALOG);
    }
  };

  const handleDeactivate = async (userId) => {
    try {
      await ApiService.deactivateUser(userId);
      setUsers(
        users.map((user) =>
          user.id === userId ? { ...user, is_approved: false } : user
        )
      );
      setError("");
    } catch (err) {
      setError(err?.error || "Failed to deactivate user");
    } finally {
      setConfirmDialog(INITIAL_CONFIRM_DIALOG);
    }
  };

  const handleDelete = async (userId) => {
    try {
      await ApiService.deleteUser(userId);
      setUsers(users.filter((user) => user.id !== userId));
      setError("");
    } catch (err) {
      setError(err.error || "Failed to delete user");
    } finally {
      setConfirmDialog(INITIAL_CONFIRM_DIALOG);
    }
  };
  const handleBulkDelete = async () => {
    try {
      setError("");
      // todo: sort using roles and then delete
      // admin & sadmin delete at last
      // todo: have a bulk delete api which deletes multiple users in background. can't rely on frontend, since this is blocking
      for (const userId of bulkDeleteDialog.selectedUsers) {
        await ApiService.deleteUser(userId);
      }
      setUsers(
        users.filter(
          (user) => !bulkDeleteDialog.selectedUsers.includes(user.id)
        )
      );
      setBulkDeleteMode(false);
      setSelectedUsers([]);
    } catch (err) {
      console.log(err);
      setError(err.error || "Failed to delete some users");
    } finally {
      setBulkDeleteDialog({ show: false, selectedUsers: [] });
    }
  };

  const handleRoleChange = async (userId, newRoleId) => {
    try {
      // newRoleId is already converted to integer or null in UserTableRow
      await ApiService.updateUserRole(userId, newRoleId);

      // Find the new role object, or set to null if no role
      const newRole = newRoleId ? roles.find((role) => role.id === newRoleId) : null;

      setUsers((prevUsers) => {
        const updatedUsers = prevUsers.map((user) =>
          user.id === userId ? { ...user, role: newRole } : user
        );
        return [...updatedUsers];
      });

      setError('');
    } catch (err) {
      console.error('❌ Failed to update role:', err);
      setError(err.message || 'Failed to update role');
    }
  };

  const handleDeviceOptionUpdate = async (userId, field, value) => {
    try {
      await ApiService.updateUserDevice(userId, { [field]: value });

      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.id === userId ? { ...user, [field]: value } : user
        )
      );

      setError('');
    } catch (err) {
      console.error('❌ Failed to update device access:', err);
      setError(err.message || 'Failed to update device access');
    }
  };

  const updateUserProfileInState = (userId, userProfileData) => {
    setUsers((prevUsers) =>
      prevUsers.map((user) => {
        if (user.id === userId) {
          return {
            ...user,
            userProfile: {
              ...(user.userProfile || {}),
              ...userProfileData
            }
          };
        }
        return user;
      })
    );
  };

  const toggleUserSelection = (userId) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const selectAllUsersFromTable = (tableUsers) => {
    const tableUserIds = tableUsers.map((user) => user.id);
    setSelectedUsers((prev) => [...new Set([...prev, ...tableUserIds])]);
  };

  const deselectAllUsersFromTable = (tableUsers) => {
    const tableUserIds = tableUsers.map((user) => user.id);
    setSelectedUsers((prev) => prev.filter((id) => !tableUserIds.includes(id)));
  };

  const showConfirmation = (userId, action, username, userRole = null) => {
    setConfirmDialog({ show: true, userId, action, username, userRole });
  };

  const showBulkDeleteConfirmation = () => {
    setBulkDeleteDialog({ show: true, selectedUsers });
  };

  const filteredUsers = useMemo(
    () =>
      users.filter(
        (user) =>
          user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.phone.includes(searchQuery)
      ),
    [users, searchQuery]
  );

  const activeUsers = useMemo(
    () => filteredUsers.filter((user) => user.is_approved),
    [filteredUsers]
  );
  const inactiveUsers = useMemo(
    () => filteredUsers.filter((user) => !user.is_approved),
    [filteredUsers]
  );
  const newUsers = useMemo(
    () => filteredUsers.filter((user) => user.last_active === null),
    [filteredUsers]
  );


  return {
    users,
    roles,
    error,
    loading,
    searchQuery,
    setSearchQuery,
    confirmDialog,
    setConfirmDialog,
    bulkDeleteMode,
    setBulkDeleteMode,
    selectedUsers,
    bulkDeleteDialog,
    setBulkDeleteDialog,
    activeUsers,
    inactiveUsers,
    newUsers,
    filteredUsers,
    handleApprove,
    handleDeactivate,
    handleDelete,
    handleBulkDelete,
    handleRoleChange,
    toggleUserSelection,
    selectAllUsersFromTable,
    deselectAllUsersFromTable,
    showConfirmation,
    showBulkDeleteConfirmation,
    handleDeviceOptionUpdate,
    updateUserProfileInState,
  };
};

export { useUserManagement };
