import { useState } from 'react';
import { UserPlus, UserMinus, Search, Users, Menu, Trash2, Link as LinkIcon } from 'lucide-react';
import { useUserManagement } from './hooks/useUserManagement';
import { useDataContext } from '../../../../context/startup/useDataContext';
import { UserTable } from './components/UserTable';
import { getUserManagementExtraColumns } from '../../../userManagementExtraColumns';
import { ConfirmationDialog } from './components/ConfirmationDialog';
import { BulkDeleteConfirmationDialog } from './components/BulkDeleteConfirmationDialog';
import { toast } from 'react-toastify';

function UserManagement() {
  const {
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
    roles,
    // deviceAccessOptions ,
    handleDeviceOptionUpdate,
    updateUserProfileInState,
  } = useUserManagement();
  const [showInactive, setShowInactive] = useState(false);
  const [showNewUsers, setShowNewUsers] = useState(false);
  const [showAllUsers, setShowAllUsers] = useState(false);
  const { setHamburgerMenu, hamburgerMenu, userData } = useDataContext();
  const isMobileView = window.innerWidth < 768;

  const confirmAction = () => {
    const { action, userId } = confirmDialog;
    if (action === 'approve') handleApprove(userId);
    if (action === 'deactivate') handleDeactivate(userId);
    if (action === 'delete') handleDelete(userId);
  };

  const handleToggleInactive = () => {
    setShowInactive((prev) => !prev);
  };

  const handleToggleNewUsers = () => {
    setShowNewUsers((prev) => !prev);
  };

  const handleToggleAllUsers = () => {
    setShowAllUsers((prev) => !prev);
  };

  const handleCancelConfirmDialog = () => {
    setConfirmDialog({ ...confirmDialog, show: false });
  };

  const handleCancelBulkDeleteDialog = () => {
    setBulkDeleteDialog({ ...bulkDeleteDialog, show: false });
  };

  const handleToggleBulkDeleteMode = () => {
    setBulkDeleteMode(!bulkDeleteMode);
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleHamburgerMenuClick = () => {
    setHamburgerMenu(!hamburgerMenu);
  };

  const handleCopySignupLink = async () => {
    try {
      const companyId = userData?.companyId || userData?.company?.id;
      if (!companyId) {
        toast.error('Company ID not found. Please try again.');
        return;
      }

      const signupUrl = `${window.location.origin}/signup?company_id=${companyId}`;
      
      await navigator.clipboard.writeText(signupUrl);
      toast.success('Sign-up link copied to clipboard!');
    } catch {
      toast.error('Failed to copy link. Please try again.');
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }


  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4 flex items-center cursor-pointer" onClick={handleHamburgerMenuClick}>
        {isMobileView ? <Menu className="mr-3" /> : <Users className="mr-3 text-blue-600" />}
        <span>User Management</span>
      </h1>
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg shadow-sm text-center">
          <p className="text-sm text-gray-500">Total Users</p>
          <p className="text-xl font-semibold text-blue-700">{filteredUsers.length}</p>
        </div>
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg shadow-sm text-center">
          <p className="text-sm text-gray-500">Active Users</p>
          <p className="text-xl font-semibold text-emerald-700">{activeUsers.length}</p>
        </div>
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg shadow-sm text-center">
          <p className="text-sm text-gray-500">Inactive Users</p>
          <p className="text-xl font-semibold text-red-700">{inactiveUsers.length}</p>
        </div>
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg shadow-sm text-center">
          <p className="text-sm text-gray-500">New Users</p>
          <p className="text-xl font-semibold text-purple-700">{newUsers.length}</p>
        </div>
      </div>

    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-2">

  <div className="flex flex-col sm:flex-row sm:ml-auto gap-2 w-full sm:w-auto">
    <div className="relative w-full sm:w-[20rem] md:w-[24rem]">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
      <input
        type="text"
        placeholder="Search users Name or Phone Number.."
        className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 w-full"
        value={searchQuery}
        onChange={handleSearchChange}
      />
    </div>
    <div className="w-full sm:w-auto flex gap-2">
      <button
        onClick={handleCopySignupLink}
        className="w-full sm:w-auto flex items-center justify-center px-2 py-1 sm:px-4 sm:py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-xs sm:text-base"
        title="Copy sign-up link for current company"
      >
        <LinkIcon size={16} className="mr-1" />
        Copy Sign-up Link
      </button>
      {bulkDeleteMode && selectedUsers.length > 0 && (
        <button
          onClick={showBulkDeleteConfirmation}
          className="w-full sm:w-auto flex items-center justify-center px-2 py-1 sm:px-4 sm:py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-xs sm:text-base"
        >
          <Trash2 size={16} className="mr-1" />
          Delete ({selectedUsers.length})
        </button>
      )}
      <button
        onClick={handleToggleBulkDeleteMode}
        className="w-full sm:w-auto flex items-center justify-center px-2 py-1 sm:px-4 sm:py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-xs sm:text-base"
      >
        {bulkDeleteMode ? <UserMinus size={16} className="mr-1" /> : <UserPlus size={16} className="mr-1" />}
        {bulkDeleteMode ? 'Exit Bulk Delete' : 'Bulk Delete'}
      </button>
    </div>
  </div>

</div>


      <UserTable
        users={activeUsers}
        roles={roles}
        title="Active Users"
        emptyMessage="No active users found."
        statusColor="bg-emerald-100"
        bulkDeleteMode={bulkDeleteMode}
        selectedUsers={selectedUsers}
        toggleUserSelection={toggleUserSelection}
        showConfirmation={showConfirmation}
        selectAllUsersFromTable={selectAllUsersFromTable}
        deselectAllUsersFromTable={deselectAllUsersFromTable}
        handleRoleChange={handleRoleChange}
      //  deviceAccessOptions ={deviceAccessOptions}
        handleDeviceOptionUpdate={handleDeviceOptionUpdate}
        extraColumns={getUserManagementExtraColumns(updateUserProfileInState)}
      />

      <div className="mb-4">
        <button onClick={handleToggleNewUsers} className="w-full flex justify-between items-center px-4 py-2 bg-purple-100 text-purple-800 rounded-md font-semibold mb-2 focus:outline-none">
          <span>New Users (Never Signed In)</span>
          <span>{showNewUsers ? '▲' : '▼'}</span>
        </button>
        {showNewUsers && (
          <UserTable
            users={newUsers}
            roles={roles}
            title="New Users (Never Signed In)"
            emptyMessage="No new users found."
            statusColor="bg-purple-100"
            bulkDeleteMode={bulkDeleteMode}
            selectedUsers={selectedUsers}
            toggleUserSelection={toggleUserSelection}
            showConfirmation={showConfirmation}
            selectAllUsersFromTable={selectAllUsersFromTable}
            deselectAllUsersFromTable={deselectAllUsersFromTable}
            handleRoleChange={handleRoleChange}
            // deviceAccessOptions={deviceAccessOptions}
            handleDeviceOptionUpdate={handleDeviceOptionUpdate}
            extraColumns={getUserManagementExtraColumns()}
          />
        )}
      </div>

      <div className="mb-4">
        <button onClick={handleToggleInactive} className="w-full flex justify-between items-center px-4 py-2 bg-orange-100 text-orange-800 rounded-md font-semibold mb-2 focus:outline-none">
          <span>Inactive Users</span>
          <span>{showInactive ? '▲' : '▼'}</span>
        </button>
        {showInactive && (
          <UserTable
            users={inactiveUsers}
            roles={roles}
            title="Inactive Users"
            emptyMessage="No inactive users found."
            statusColor="bg-red-100"
            bulkDeleteMode={bulkDeleteMode}
            selectedUsers={selectedUsers}
            toggleUserSelection={toggleUserSelection}
            showConfirmation={showConfirmation}
            selectAllUsersFromTable={selectAllUsersFromTable}
            deselectAllUsersFromTable={deselectAllUsersFromTable}
            handleRoleChange={handleRoleChange}
            // deviceAccessOptions={deviceAccessOptions}
            handleDeviceOptionUpdate={handleDeviceOptionUpdate}
            extraColumns={getUserManagementExtraColumns()}
          />
        )}
      </div>

      <div className="mb-4">
        <button onClick={handleToggleAllUsers} className="w-full flex justify-between items-center px-4 py-2 bg-gray-100 text-gray-800 rounded-md font-semibold mb-2 focus:outline-none">
          <span>All Users</span>
          <span>{showAllUsers ? '▲' : '▼'}</span>
        </button>
        {showAllUsers && (
          <UserTable
            users={filteredUsers}
            roles={roles}
            title="All Users"
            emptyMessage="No users found."
            statusColor="bg-gray-100"
            bulkDeleteMode={bulkDeleteMode}
            selectedUsers={selectedUsers}
            toggleUserSelection={toggleUserSelection}
            showConfirmation={showConfirmation}
            selectAllUsersFromTable={selectAllUsersFromTable}
            deselectAllUsersFromTable={deselectAllUsersFromTable}
            handleRoleChange={handleRoleChange}
            // deviceAccessOptions={deviceAccessOptions}
            handleDeviceOptionUpdate={handleDeviceOptionUpdate}
            extraColumns={getUserManagementExtraColumns()}
          />
        )}
      </div>

      <ConfirmationDialog
        dialog={confirmDialog}
        onConfirm={confirmAction}
        onCancel={handleCancelConfirmDialog}
      />

      <BulkDeleteConfirmationDialog
        dialog={bulkDeleteDialog}
        onConfirm={handleBulkDelete}
        onCancel={handleCancelBulkDeleteDialog}
      />
    </div>
  );
}

export { UserManagement };
