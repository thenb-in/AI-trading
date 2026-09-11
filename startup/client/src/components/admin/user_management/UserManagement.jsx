import { useState } from 'react';
import { UserPlus, UserMinus, Search, Users, Menu, Trash2, QrCode } from 'lucide-react';
import { useUserManagement } from './hooks/useUserManagement';
import { useDataContext } from '@context/useDataContext';
import { Loader } from '@/components/common/Loader';
import { UserTable } from './components/UserTable';
import { getUserManagementExtraColumns, useApproveExtension } from '@data/userManagementRegistry';
import { ConfirmationDialog } from './components/ConfirmationDialog';
import { BulkDeleteConfirmationDialog } from './components/BulkDeleteConfirmationDialog';
import { InviteLinkButton } from './components/InviteLinkButton';
import { QRCodeDisplay } from '@/components/common/QRCodeDisplay';
import { MasterModal } from '@startup/components/base_components/master/master_modal/MasterModal';
import { toast } from 'react-toastify';
import { SearchTypeField } from '@startup/components/base_components/fields/SearchTypeField';

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
    updateUser,
    updateUserProfileInState,
    walletUserManagementUrl,
  } = useUserManagement();
  const [showInactive, setShowInactive] = useState(false);
  const [showNewUsers, setShowNewUsers] = useState(true);
  const [showAllUsers, setShowAllUsers] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const { setHamburgerMenu, hamburgerMenu, userData } = useDataContext();
  const isMobileView = window.innerWidth < 768;
  const companyId = userData?.companyId || userData?.company?.id;
  const approveExtension = useApproveExtension({ confirmDialog });
  const confirmAction = async (requirePasswordReset = false, roleId = null) => {
    const { action, userId } = confirmDialog;
    if (action === 'approve') {
      await handleApprove(userId, requirePasswordReset, roleId);
      const user = filteredUsers.find((u) => u.id === userId);
      if (user) await approveExtension.runAfterApprove(user);
    }
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

  const handleShowQRCode = () => {
    if (!companyId) {
      toast.error('Company ID not found. Please try again.');
      return;
    }
    setShowQRModal(true);
  };




  const sharedTableProps = {
    roles,
    bulkDeleteMode,
    selectedUsers,
    toggleUserSelection,
    showConfirmation,
    selectAllUsersFromTable,
    deselectAllUsersFromTable,
    handleRoleChange,
    handleDeviceOptionUpdate,
    updateUser,
    walletUserManagementUrl,
  };

  if (loading) {
    return <Loader message="Loading users..." />;
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

    <div className="relative w-full sm:w-[20rem] md:w-[24rem]">
      <SearchTypeField
        icon={<Search className="w-4 h-4 text-gray-400" />}
        placeholder="Search users Name or Phone Number.."
        value={searchQuery}
        onChange={handleSearchChange}
        className="w-full"
      />
    </div>

    <div className="w-full sm:w-auto flex flex-wrap items-center gap-2">

      <InviteLinkButton
        label="Sign-up link"
        path="/signup"
        companyId={companyId}
        tone="green"
        testId="copy-signup-link"
      />
      <button
        onClick={handleShowQRCode}
        className="w-full sm:w-auto flex items-center justify-center px-2 py-1 sm:px-4 sm:py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors text-xs sm:text-base"
        title="Download QR code for sign-up link"
      >
        <QrCode size={16} className="mr-1" />
        QR
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


      <UserTable
        {...sharedTableProps}
        users={activeUsers}
        title="Active Users"
        emptyMessage="No active users found."
        statusColor="bg-emerald-100"
        extraColumns={getUserManagementExtraColumns(updateUserProfileInState)}
      />

      <div className="mb-4">
        <button onClick={handleToggleNewUsers} className="w-full flex justify-between items-center px-4 py-2 bg-purple-100 text-purple-800 rounded-md font-semibold focus:outline-none">
          <span>New Users (Never Signed In) ({newUsers.length})</span>
          <span>{showNewUsers ? '▲' : '▼'}</span>
        </button>
        {showNewUsers && (
          <UserTable
            {...sharedTableProps}
            users={newUsers}
            title="New Users (Never Signed In)"
            emptyMessage="No new users found."
            statusColor="bg-purple-100"
            extraColumns={getUserManagementExtraColumns()}
          />
        )}
      </div>

      <div className="mb-4">
        <button onClick={handleToggleInactive} className="w-full flex justify-between items-center px-4 py-2 bg-orange-100 text-orange-800 rounded-md font-semibold focus:outline-none">
          <span>Inactive Users</span>
          <span>{showInactive ? '▲' : '▼'}</span>
        </button>
        {showInactive && (
          <UserTable
            {...sharedTableProps}
            users={inactiveUsers}
            title="Inactive Users"
            emptyMessage="No inactive users found."
            statusColor="bg-red-100"
            extraColumns={getUserManagementExtraColumns()}
          />
        )}
      </div>

      <div className="mb-4">
        <button onClick={handleToggleAllUsers} className="w-full flex justify-between items-center px-4 py-2 bg-gray-100 text-gray-800 rounded-md font-semibold focus:outline-none">
          <span>All Users</span>
          <span>{showAllUsers ? '▲' : '▼'}</span>
        </button>
        {showAllUsers && (
          <UserTable
            {...sharedTableProps}
            users={filteredUsers}
            title="All Users"
            emptyMessage="No users found."
            statusColor="bg-gray-100"
            extraColumns={getUserManagementExtraColumns()}
          />
        )}
      </div>


      <ConfirmationDialog
        dialog={confirmDialog}
        onConfirm={confirmAction}
        onCancel={handleCancelConfirmDialog}
        isSupportUser={userData?.isSupportUser || false}
        roles={roles}
        extraContent={approveExtension.renderExtras}
      />

      <BulkDeleteConfirmationDialog
        dialog={bulkDeleteDialog}
        onConfirm={handleBulkDelete}
        onCancel={handleCancelBulkDeleteDialog}
      />

      <MasterModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        title="Company Onboarding"
        maxWidth="sm"
      >
        <QRCodeDisplay
          content={companyId}
          heading="Join Company via QR Code"
          message="Scan this QR code to complete your onboarding and join the company."
          showCopyableValue
          valueLabel="Company ID"
          onDownload={() => setShowQRModal(false)}
        />
      </MasterModal>
    </div>
  );
}

export { UserManagement };
