import { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { BaseModal } from '@startup/components/base_components/master';
import { useCompanyUserData } from './useCompanyUserData';
import { UserAssignmentSection } from './UserAssignmentSection';
import { ApiService } from '@services/ApiService';

const businessLockedReason = (user) => (user.isDirectUser ? 'Direct user' : null);

function UserCompanyAssignmentModal({ isOpen, onClose, company, onSuccess }) {
  const { companyUsers, supportUsers, businessUsers, loading, loadCompanyUsers } = useCompanyUserData(isOpen, company);

  const [assigningId, setAssigningId] = useState(null);
  const [removingId, setRemovingId] = useState(null);

  const companyId = company?.id || '';
  const companyName = company?.name || 'Company';

  const assignedSupport = companyUsers.filter((user) => user.isSupportUser);
  const assignedBusiness = companyUsers.filter((user) => !user.isSupportUser);

  const nameOf = useCallback(
    (userId) => [...supportUsers, ...businessUsers, ...companyUsers]
      .find((user) => String(user.id) === String(userId))?.name || 'User',
    [supportUsers, businessUsers, companyUsers]
  );

  const handleAssign = useCallback(async (userId) => {
    if (!userId || !companyId) return false;
    const userName = nameOf(userId);
    setAssigningId(userId);
    try {
      await ApiService.assignUserToCompany(userId, companyId);
      toast.success(`${userName} has been assigned to ${companyName} successfully`);
      await loadCompanyUsers();
      onSuccess?.();
      return true;
    } catch (error) {
      toast.error(`Failed to assign ${userName} to ${companyName}: ${error.message || 'Unknown error'}`);
      return false;
    } finally {
      setAssigningId(null);
    }
  }, [companyId, companyName, nameOf, loadCompanyUsers, onSuccess]);

  const handleRemove = useCallback(async (userId) => {
    const userName = nameOf(userId);
    setRemovingId(userId);
    try {
      await ApiService.removeUserFromCompany(userId, companyId);
      toast.success(`${userName} has been removed from ${companyName} successfully`);
      await loadCompanyUsers();
      onSuccess?.();
    } catch (error) {
      toast.error(`Failed to remove ${userName} from ${companyName}: ${error.message || 'Unknown error'}`);
    } finally {
      setRemovingId(null);
    }
  }, [companyId, companyName, nameOf, loadCompanyUsers, onSuccess]);

  const handleClose = useCallback(() => {
    if (assigningId || removingId) return;
    onClose();
  }, [assigningId, removingId, onClose]);

  const title = (
    <span className="text-xl font-bold text-gray-900">
      {'Assign Users for '}
      <span className="text-blue-600">{companyName}</span>
    </span>
  );

  return (
    <BaseModal isOpen={isOpen} onClose={handleClose} title={title} maxWidth="md" showAudit={false}>
      {loading ? (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="space-y-6">
          <UserAssignmentSection
            title="Support Users"
            assignableUsers={supportUsers}
            assignedUsers={assignedSupport}
            onAssign={handleAssign}
            onRemove={handleRemove}
            assigningId={assigningId}
            removingId={removingId}
            loading={loading}
          />
          <UserAssignmentSection
            title="Business Users"
            note="From this company's groups. A user whose home company is this one is a direct user and cannot be removed."
            assignableUsers={businessUsers}
            assignedUsers={assignedBusiness}
            onAssign={handleAssign}
            onRemove={handleRemove}
            assigningId={assigningId}
            removingId={removingId}
            loading={loading}
            lockedReason={businessLockedReason}
          />
        </div>
      )}
    </BaseModal>
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
