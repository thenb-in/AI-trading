import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { AlertTriangle } from 'lucide-react';
import { CheckboxTypeField } from '@startup/components/base_components/fields/CheckboxTypeField';

const ConfirmationDialog = ({ dialog, onConfirm, onCancel, isSupportUser = false, roles = [], extraContent = null }) => {
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

  if (!dialog.show) return null;

  const actions = {
    approve: {
      title: 'Approve User',
      message: `Are you sure you want to approve ${dialog.username}?`,
      buttonText: 'Approve',
      buttonClass: 'bg-green-600 hover:bg-green-700',
    },
    deactivate: {
      title: 'Deactivate User',
      message: `Are you sure you want to deactivate ${dialog.username}?`,
      buttonText: 'Deactivate',
      buttonClass: 'bg-yellow-600 hover:bg-yellow-700',
    },
    delete: {
      title: 'Delete User',
      message: `Are you sure you want to permanently delete ${dialog.username}? This action cannot be undone.`,
      buttonText: 'Delete',
      buttonClass: 'bg-red-600 hover:bg-red-700',
    },
  };

  const currentAction = actions[dialog.action] || {};

  const handleConfirm = () => {
    if (dialog.action === 'approve') {
      // If user has no role and no role is selected, don't allow approval
      const needsRole = !dialog.userRole;
      if (needsRole && !selectedRoleId) {
        return; // Don't proceed if role is required but not selected
      }
      // If user already has a role, pass null to keep it unchanged
      // If user has no role, pass the selected roleId
      const roleIdToPass = dialog.userRole ? null : selectedRoleId;
      onConfirm(requirePasswordReset, roleIdToPass);
    } else {
      onConfirm();
    }
  };

  const handleCancel = () => {
    setRequirePasswordReset(false);
    setSelectedRoleId(null);
    onCancel();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full">
        <div className="flex items-center mb-4">
          <AlertTriangle className="text-red-500 mr-3" size={24} />
          <h2 className="text-xl font-bold">{currentAction.title}</h2>
        </div>
        <p className="mb-6 text-gray-700">{currentAction.message}</p>
        {dialog.action === 'approve' && (
          <div className="mb-6 space-y-4">
            {!dialog.userRole && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Role <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedRoleId || ''}
                  onChange={(e) => setSelectedRoleId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white text-gray-900 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">-- Select a role --</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name} {role.description ? `- ${role.description}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <label className="flex items-center gap-2 cursor-pointer">
              <CheckboxTypeField
                mode="bare"
                checked={requirePasswordReset}
                onChange={(e) => setRequirePasswordReset(e.target.checked)}
                className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
              />
              <span className="text-sm text-gray-700">
                User must reset password on next login
              </span>
            </label>
            {extraContent}
          </div>
        )}
        <div className="flex justify-end space-x-4">
          <button
            onClick={handleCancel}
            className="px-4 py-2 rounded-md text-gray-700 bg-gray-200 hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={dialog.action === 'approve' && !dialog.userRole && !selectedRoleId}
            className={`px-4 py-2 rounded-md text-white ${currentAction.buttonClass} transition-colors ${
              dialog.action === 'approve' && !dialog.userRole && !selectedRoleId
                ? 'opacity-50 cursor-not-allowed'
                : ''
            }`}
          >
            {currentAction.buttonText}
          </button>
        </div>
      </div>
    </div>
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
  roles: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      name: PropTypes.string.isRequired,
      description: PropTypes.string,
    })
  ),
  extraContent: PropTypes.node,
};

export { ConfirmationDialog };
