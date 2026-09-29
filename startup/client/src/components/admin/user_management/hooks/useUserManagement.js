import { useState, useEffect, useMemo } from "react";
import { ApiService } from "@services/ApiService";
import { getApiErrorMessage } from '@utils/apiErrorMessage';

const INITIAL_CONFIRM_DIALOG = { show: false, userId: null, action: null, username: "", userRole: null };

const useUserManagement = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  // Wallet's user-management page — only sent when Wallet is configured here.
  const [walletUserManagementUrl, setWalletUserManagementUrl] = useState(null);
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
  // { [userId]: { online, signedIn, lastActive, devices: [{ label, ip, since }] } }
  const [sessions, setSessions] = useState({});
  const fetchData = async () => {
    try {
      setLoading(true);
      const usersResponse = await ApiService.getAllUsers();
      setUsers(usersResponse.data.users);
      setRoles(usersResponse.data.roles);
      setWalletUserManagementUrl(usersResponse.data.walletUserManagementUrl || null);
      setError("");
    } catch (err) {
      setError(err.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  // Who was signed in, and who was connected, when this screen loaded. Read
  // once: nothing here polls, so what is on screen is the picture the page was
  // opened with. Kept apart from the roster so a failure here does not take the
  // user list down with it.
  const fetchSessions = async () => {
    try {
      const response = await ApiService.getUserSessions();
      setSessions(response.data?.data?.sessions ?? {});
    } catch (err) {
      console.error(`Failed to load user sessions: ${err.message}`);
    }
  };

  useEffect(() => {
    fetchData();
    fetchSessions();
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
      setError(getApiErrorMessage(err, "Failed to deactivate user"));
    } finally {
      setConfirmDialog(INITIAL_CONFIRM_DIALOG);
    }
  };

  // Ends every session the user has. They stay approved and can sign in again —
  // this is the button for a device left signed in somewhere it should not be.
  const handleSignOut = async (userId) => {
    try {
      await ApiService.signOutUser(userId);
      // The screen holds the picture it loaded with; this one session just
      // ended, so say so here rather than re-reading everyone else's.
      setSessions((current) => ({
        ...current,
        [userId]: { ...current[userId], online: false, signedIn: false, devices: [] }
      }));
      setError("");
      return true;
    } catch (err) {
      setError(err.message || "Failed to sign the user out");
      return false;
    } finally {
      setConfirmDialog(INITIAL_CONFIRM_DIALOG);
    }
  };
  const handleSignOutDevice = async (userId, sessionId) => {
    try {
      await ApiService.signOutDevice(userId, sessionId);
      setSessions((current) => {
        const existing = current[userId];
        if (!existing) {
          return current;
        }
        const devices = (existing.devices || []).filter((device) => device.id !== sessionId);
        return { ...current, [userId]: { ...existing, devices, signedIn: devices.length > 0 } };
      });
      setError("");
      return true;
    } catch (err) {
      setError(err.message || "Failed to sign the device out");
      return false;
    }
  };

  const handleDelete = async (userId) => {
    try {
      await ApiService.deleteUser(userId);
      setUsers(users.filter((user) => user.id !== userId));
      setError("");
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to delete user"));
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
      setError(getApiErrorMessage(err, "Failed to delete some users"));
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
      return true;
    } catch (err) {
      console.error('❌ Failed to update role:', err);
      setError(err.message || 'Failed to update role');
      // The caller reports the outcome next to the row the user is looking at;
      // the banner at the top of the page is easy to miss from down here.
      return false;
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

  const updateUser = async (userId, fields) => {
    const res = await ApiService.updateUser(userId, fields);
    const updated = res?.data?.user || fields;
    setUsers((prevUsers) =>
      prevUsers.map((user) => (user.id === userId ? { ...user, ...updated } : user))
    );
    setError('');
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

  // name and phone are optional on a user (SSO / admin-made logins can lack them).
  const filteredUsers = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return users.filter((user) =>
      [user.username, user.name, user.phone].some((field) => (field || '').toLowerCase().includes(q))
    );
  }, [users, searchQuery]);

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
    walletUserManagementUrl,
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
    handleSignOut,
    handleSignOutDevice,
    handleDelete,
    handleBulkDelete,
    handleRoleChange,
    toggleUserSelection,
    selectAllUsersFromTable,
    deselectAllUsersFromTable,
    showConfirmation,
    showBulkDeleteConfirmation,
    handleDeviceOptionUpdate,
    updateUser,
    updateUserProfileInState,
    sessions,
  };
};

export { useUserManagement };
