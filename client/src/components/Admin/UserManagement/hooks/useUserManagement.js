import { useState, useEffect, useMemo } from "react";
import ApiService from "../../../../services/ApiService";

export const useUserManagement = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  // const [deviceAccessOptions, setDeviceAccessOptions] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmDialog, setConfirmDialog] = useState({
    show: false,
    userId: null,
    action: null,
    username: "",
  });
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
        // setDeviceAccessOptions(usersResponse.data.deviceAccessOptions);
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
  const handleApprove = async (userId) => {
    try {
      await ApiService.approveUser(userId);
      setUsers(
        users.map((user) =>
          user.id === userId ? { ...user, is_approved: true } : user
        )
      );
      setError("");
    } catch (err) {
      setError(err.message || "Failed to approve user");
    } finally {
      setConfirmDialog({
        show: false,
        userId: null,
        action: null,
        username: "",
      });
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
      setError(err.message || "Failed to deactivate user");
    } finally {
      setConfirmDialog({
        show: false,
        userId: null,
        action: null,
        username: "",
      });
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
      setConfirmDialog({
        show: false,
        userId: null,
        action: null,
        username: "",
      });
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
  
    await ApiService.updateUserRole(userId, newRoleId);
    const newRole = roles.find((role) => role.id == newRoleId);

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

  const showConfirmation = (userId, action, username) => {
    setConfirmDialog({ show: true, userId, action, username });
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

  return {
    users,
    roles,
    // deviceAccessOptions,
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
    handleDeviceOptionUpdate
  };
};
