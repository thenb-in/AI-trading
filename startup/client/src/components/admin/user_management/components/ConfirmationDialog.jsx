import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { ConfirmModal } from '@startup/components/base_components/master';
import { CheckboxTypeField } from '@startup/components/base_components/fields/CheckboxTypeField';
import { RoleSelector } from '@startup/components/admin/RoleSelector';

// What each action asks, and how loudly. Approve is the only one that needs an
// answer before it can go ahead, which is why it carries fields below.
const ACTIONS = {
  approve: { title: 'Approve User', confirmText: 'Approve', tone: 'success' },
  deactivate: { title: 'Deactivate User', confirmText: 'Deactivate', tone: 'warning' },
  signOut: { title: 'Sign User Out', confirmText: 'Sign Out', tone: 'primary' },
  delete: { title: 'Delete User', confirmText: 'Delete', tone: 'danger' }
};

const message = (action, username) => ({
  approve: `Are you sure you want to approve ${username}?`,
  deactivate: `Are you sure you want to deactivate ${username}?`,
  signOut: `Sign ${username} out of every device? They stay approved and can sign in again.`,
  delete: `Are you sure you want to permanently delete ${username}? This action cannot be undone.`
}[action]);

const ConfirmationDialog = ({ dialog, onConfirm, onCancel, isSupportUser = false, extraContent = null }) => {
  const [requirePasswordReset, setRequirePasswordReset] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState(null);

  useEffect(() => {
    if (!dialog.show) {
      setRequirePasswordReset(false);
      setSelectedRoleId(null);
    } else if (dialog.action === 'approve') {
      // Set checkbox based on isSupportUser flag: checked if isSupportUser is true, unchecked otherwise
      setRequirePasswordReset(isSupportUser === true);
      // If user has no role, reset selectedRoleId to null so user can select
      // If user has a role, we don't need to set selectedRoleId (it will remain null)
      if (!dialog.userRole) {
        setSelectedRoleId(null);
      }
    }
  }, [dialog.show, dialog.action, isSupportUser, dialog.userRole]);

  const action = ACTIONS[dialog.action] || ACTIONS.delete;
  const isApprove = dialog.action === 'approve';
  // Approving someone who holds no role has to give them one first.
  const needsRole = isApprove && !dialog.userRole && !selectedRoleId;

  const handleConfirm = () => {
    if (!isApprove) {
      onConfirm();
      return;
    }
    // If user already has a role, pass null to keep it unchanged
    // If user has no role, pass the selected roleId
    onConfirm(requirePasswordReset, dialog.userRole ? null : selectedRoleId);
  };

  const handleRoleChange = (value) => setSelectedRoleId(value ? Number(value) : null);
  const handlePasswordResetChange = (e) => setRequirePasswordReset(e.target.checked);

  const handleCancel = () => {
    setRequirePasswordReset(false);
    setSelectedRoleId(null);
    onCancel();
  };

  return (
    <ConfirmModal
      isOpen={dialog.show}
      onClose={handleCancel}
      onConfirm={handleConfirm}
      title={action.title}
      message={message(dialog.action, dialog.username)}
      confirmText={action.confirmText}
      tone={action.tone}
      confirmDisabled={needsRole}
    >
      {isApprove && (
        <div className="mt-4 space-y-4">
          {!dialog.userRole && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Role <span className="text-red-500">*</span>
              </label>
              <RoleSelector
                value={selectedRoleId}
                onChange={handleRoleChange}
                label={null}
                className=""
                allowCreate={false}
              />
            </div>
          )}
          <label className="flex items-center gap-2 cursor-pointer">
            <CheckboxTypeField
              mode="bare"
              checked={requirePasswordReset}
              onChange={handlePasswordResetChange}
              className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
            />
            <span className="text-sm text-gray-700">
              User must reset password on next login
            </span>
          </label>
          {extraContent}
        </div>
      )}
    </ConfirmModal>
  );
};

ConfirmationDialog.propTypes = {
  dialog: PropTypes.shape({
    show: PropTypes.bool.isRequired,
    username: PropTypes.string,
    action: PropTypes.string,
    userRole: PropTypes.shape({
      id: PropTypes.number,
      name: PropTypes.string,
    }),
  }).isRequired,
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  isSupportUser: PropTypes.bool,
  extraContent: PropTypes.node,
};

export { ConfirmationDialog };
