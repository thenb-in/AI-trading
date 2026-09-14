import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Loader2 } from 'lucide-react';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { toast } from 'react-toastify';
import { useCompanyUserData } from './useCompanyUserData';
import { UserCompanyAssignmentHeader } from './UserCompanyAssignmentHeader';
import { UserAssignmentForm } from './UserAssignmentForm';
import { UserAssignmentList } from './UserAssignmentList';
import { ApiService } from '@services/ApiService';

function UserCompanyAssignmentModal({ isOpen, onClose, company, onSuccess }) {
  const { companyUsers, loading, loadCompanyUsers } = useCompanyUserData(isOpen, company);

  const [selectedUser, setSelectedUser] = useState('');
  const [selectedUserName, setSelectedUserName] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [removing, setRemoving] = useState(false);

  // Use the company ID from props - modal is always for a specific company
  const selectedCompany = company?.id || '';

  useEscapeKey(onClose, isOpen);

  const resetSelection = useCallback(() => {
    setSelectedUser('');
  }, []);

  // Reset selections each time modal opens or company changes to avoid stale state
  useEffect(() => {
    if (isOpen) {
      resetSelection();
    }
  }, [isOpen, resetSelection]);

  const isUnassigned = useCallback(
    (user) => !companyUsers.some((assigned) => (assigned.id || assigned.username) === (user.id || user.username)),
    [companyUsers]
  );

  const handleSelectUser = useCallback((value, user) => {
    setSelectedUser(value ?? '');
    setSelectedUserName(user?.name || user?.username || '');
  }, []);

  const handleBackdropClick = useCallback((e) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  const handleStopPropagation = useCallback((e) => {
    e.stopPropagation();
  }, []);

  const handleAssignUser = useCallback(async () => {
    if (!selectedUser || !selectedCompany) {
      toast.error('Please select a user to assign');
      return;
    }

    const userName = selectedUserName || 'User';
    const companyName = company?.name || 'Company';

    setAssigning(true);
    try {
      // ApiService is used inside useCompanyUserData hook; this action uses the same API layer
      await ApiService.assignUserToCompany(selectedUser, selectedCompany);
      toast.success(`${userName} has been assigned to ${companyName} successfully`);
      await loadCompanyUsers(selectedCompany);
      setSelectedUser('');
      onSuccess?.();
    } catch (error) {
      toast.error(`Failed to assign ${userName} to ${companyName}: ${error.message || 'Unknown error'}`);
    } finally {
      setAssigning(false);
    }
  }, [selectedUser, selectedUserName, selectedCompany, company?.name, loadCompanyUsers, onSuccess]);

  const handleRemoveUser = useCallback(async (userId) => {
    const user = companyUsers.find(u => (u.id || u.username) === userId);
    const userName = user?.name || user?.username || 'User';
    const companyName = company?.name || 'Company';

    setRemoving(userId);
    try {
      // ApiService is used inside useCompanyUserData hook; this action uses the same API layer
      await ApiService.removeUserFromCompany(userId, selectedCompany);
      toast.success(`${userName} has been removed from ${companyName} successfully`);
      await loadCompanyUsers(selectedCompany);
      onSuccess?.();
    } catch (error) {
      toast.error(`Failed to remove ${userName} from ${companyName}: ${error.message || 'Unknown error'}`);
    } finally {
      setRemoving(false);
    }
  }, [selectedCompany, companyUsers, company?.name, loadCompanyUsers, onSuccess]);

  const handleClose = useCallback(() => {
    if (assigning || removing) return;
    resetSelection();
    onClose();
  }, [assigning, removing, resetSelection, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={handleStopPropagation}
      >
        <UserCompanyAssignmentHeader
          companyName={company?.name}
          onClose={handleClose}
          disabled={assigning || removing}
        />

        {/* Content */}
        <div className="p-6 space-y-6">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <>
              <UserAssignmentForm
                selectedUser={selectedUser}
                assigning={assigning}
                loading={loading}
                onSelectUser={handleSelectUser}
                onAssign={handleAssignUser}
                isUnassigned={isUnassigned}
              />

              <UserAssignmentList
                companyName={company?.name}
                companyUsers={companyUsers}
                removing={removing}
                onRemove={handleRemoveUser}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

UserCompanyAssignmentModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  company: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    name: PropTypes.string
  }),
  onSuccess: PropTypes.func
};

export { UserCompanyAssignmentModal };
