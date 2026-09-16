import { memo, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import { toast } from 'react-toastify';
import { Trash2, Clock, AlertTriangle, Monitor, Smartphone, MonitorSmartphone, UserRoundCheck,Globe, ExternalLink } from 'lucide-react';
import { RoleBadge } from './RoleBadge';
import { EditFieldModal } from './EditFieldModal';
import { useDataContext } from '@context/useDataContext';
import { hasPermission } from '@utils/hasPermission';
import { CheckboxTypeField } from '@startup/components/base_components/fields/CheckboxTypeField';
import { RoleSelector } from '@startup/components/admin/RoleSelector';

// SearchableDropdown speaks strings, and '' is its "nothing selected" value —
// which is not the same as deliberately choosing to remove someone's role.
// Role names here run to `attendance_admin`; the table shows the name alone.
const roleName = (role) => role.name;

const WALLET_WINDOW_NAME = 'nbnextWallet';
const WALLET_WINDOW_FEATURES = 'popup=yes,width=1180,height=820';

const UserTableRow = ({
  user,
  selectedUsers,
  bulkDeleteMode,
  toggleUserSelection,
  showConfirmation,
  formatLastActive,
  handleRoleChange,
  handleDeviceOptionUpdate,
  updateUser,
  walletUserManagementUrl,
  extraColumns = []
}) => {
  const dataContext = useDataContext();
  const canUpdateUser = hasPermission(dataContext.userData, 'update_user');
  const [editingRole, setEditingRole] = useState(false);
  const [editingDevice, setEditingDevice] = useState(false);
  // Which identity field (name | username | email | phone) is being edited in the modal, or null.
  const [editField, setEditField] = useState(null);


  const openFieldEdit = (field) => (e) => {
    e.stopPropagation();
    if (!canUpdateUser) return;
    setEditField(field);
  };

  const deviceRef = useRef(null);

  const isSelected = selectedUsers?.includes(user.id);
  const canUpdateRole = hasPermission(dataContext.userData, 'update_role');
  const fieldEditClass = canUpdateUser
    ? 'cursor-pointer hover:text-blue-600 hover:underline'
    : 'cursor-default';

  const handleRowClick = () => {
    if (bulkDeleteMode) {
      toggleUserSelection(user.id);
    }
  };

  // A role can be taken away, not just swapped: clearing the field sends null.
  const onRoleChange = async (value, next) => {
    const newRoleId = value ? parseInt(value, 10) : null;
    if (newRoleId === (user?.role?.id ?? null)) {
      setEditingRole(false);
      return;
    }
    const who = user.name || user.username;
    const ok = await handleRoleChange(user.id, newRoleId);
    // Changing what someone is allowed to do should say so. It used to happen
    // in silence, with failures surfacing in a banner at the top of the page.
    if (ok) {
      toast.success(next ? `${who} is now ${next.name}` : `${who} now has no role`);
    } else {
      toast.error(`Could not change the role for ${who}`);
    }
    setEditingRole(false);
  };

  const onDeviceChange = async (key, value) => {
    await handleDeviceOptionUpdate(user.id, key, value);
  };

  const handleCheckboxClick = (e) => {
    e.stopPropagation();
  };

  const handleCheckboxChange = () => {
    toggleUserSelection(user.id);
  };

  const handleStopPropagation = (e) => {
    e.stopPropagation();
  };

  const handleEditRoleClick = (e) => {
    e.stopPropagation();
    setEditingRole(true);
  };

  const handleToggleSelection = () => {
    toggleUserSelection(user.id);
  };

  const handleRoleBlur = () => {
    setEditingRole(false);
  };

  const handleMobileAppChange = (e) => {
    onDeviceChange('mobileApp', e.target.checked);
  };

  const handleDesktopWebChange = (e) => {
    onDeviceChange('desktopWeb', e.target.checked);
  };

  const handleMobileWebChange = (e) => {
    onDeviceChange('mobileWeb', e.target.checked);
  };

  const handleDeactivateClick = () => {
    showConfirmation(user.id, 'deactivate', user.name);
  };

  const handleApproveClick = () => {
    showConfirmation(user.id, 'approve', user.name, user.role);
  };

  const handleDeleteClick = () => {
    showConfirmation(user.id, 'delete', user.name);
  };

  const showWalletLink = Boolean(user.isSso && walletUserManagementUrl);

  const handleWalletClick = () => {
    const popup = window.open(walletUserManagementUrl, WALLET_WINDOW_NAME, WALLET_WINDOW_FEATURES);
    popup?.focus();
  };

  const handleDeviceClick = (e) => {
    e.stopPropagation();
    setEditingDevice(true);
  };

  // Collect active device access
  const activeDevices = [];
  if (user.mobileApp) activeDevices.push({ label: 'Mobile App', icon: <Smartphone size={14} className="text-blue-500" /> });
  if (user.desktopWeb) activeDevices.push({ label: 'Desktop Web', icon: <Monitor size={14} className="text-green-500" /> });
  if (user.mobileWeb) activeDevices.push({ label: 'Mobile Web', icon: <Globe size={14} className="text-purple-500" /> });

  // Close device editor on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (editingDevice && deviceRef.current && !deviceRef.current.contains(e.target)) {
        setEditingDevice(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [editingDevice]);

  return (
    <tr
      onClick={handleRowClick}
      className={`
        ${isSelected ? 'bg-blue-50' : ''}
        ${bulkDeleteMode ? 'cursor-pointer' : ''}
        hover:bg-blue-100 transition-colors duration-150
      `}
    >
      {bulkDeleteMode && (
        <td className="px-4 py-4 whitespace-nowrap">
          <CheckboxTypeField
            mode="bare"
            checked={isSelected}
            onClick={handleCheckboxClick}
            onChange={handleCheckboxChange}
            className="form-checkbox h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
          />
        </td>
      )}
      <td className="px-6 py-4 whitespace-nowrap">
        <button
          type="button"
          onClick={openFieldEdit('name')}
          disabled={!canUpdateUser}
          title={canUpdateUser ? 'Click to edit name' : 'You do not have permission to update users'}
          className={`text-left text-sm font-medium text-gray-900 ${fieldEditClass}`}
        >
          {user.name || '—'}
        </button>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <button
          type="button"
          onClick={openFieldEdit('username')}
          disabled={!canUpdateUser}
          title={canUpdateUser ? 'Click to edit username' : 'You do not have permission to update users'}
          className={`text-left text-sm text-gray-500 ${fieldEditClass}`}
        >
          {user.username || '—'}
        </button>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <button
          type="button"
          onClick={openFieldEdit('email')}
          disabled={!canUpdateUser}
          title={canUpdateUser ? 'Click to edit email' : 'You do not have permission to update users'}
          className={`text-left text-sm text-gray-500 ${fieldEditClass}`}
        >
          {user.email || '—'}
        </button>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <button
          type="button"
          onClick={openFieldEdit('phone')}
          disabled={!canUpdateUser}
          title={canUpdateUser ? 'Click to edit phone' : 'You do not have permission to update users'}
          className={`text-left text-sm text-gray-500 ${fieldEditClass}`}
        >
          {user.phone || '—'}
        </button>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {editingRole ? (
          // Wide enough to read a role name in: the column is sized for a badge,
          // and role names here run to `attendance_admin`.
          <div onClick={handleStopPropagation} className="min-w-[14rem]">
            <RoleSelector
              value={user?.role?.id}
              onChange={onRoleChange}
              onClose={handleRoleBlur}
              describeRole={roleName}
              label={null}
              className=""
              placeholder="No Role"
              allowCreate={false}
              autoOpen
              disabled={!canUpdateRole}
            />
          </div>
        ) : (
          <div
            className={`flex items-center gap-2 rounded px-2 py-1 transition-colors duration-150 ${
              canUpdateRole 
                ? 'cursor-pointer hover:bg-gray-50' 
                : 'cursor-not-allowed opacity-60'
            }`}
            onClick={canUpdateRole ? handleEditRoleClick : undefined}
            title={!canUpdateRole ? 'You do not have permission to update roles' : ''}
          >
            <RoleBadge role={user?.role?.name} description={user?.role?.description} />
          </div>
        )}
      </td>

      {/* Extra columns injected from app level */}
      {extraColumns.map((col) => (
        <td key={col.key || col.header} className="px-6 py-4 whitespace-nowrap">
          {col.render(user)}
        </td>
      ))}

      {/* Device access column - boolean flags */}
      <td className="px-6 py-4 whitespace-nowrap" ref={deviceRef}>
        {editingDevice ? (
          <div className="flex flex-col gap-1 text-sm">
            <label className="flex items-center gap-2">
              <CheckboxTypeField
                mode="bare"
                checked={!!user.mobileApp}
                onClick={handleStopPropagation}
                onChange={handleMobileAppChange}
              />
              <Smartphone size={14} className="text-blue-500" /> Mobile App
            </label>
            <label className="flex items-center gap-2">
              <CheckboxTypeField
                mode="bare"
                checked={!!user.desktopWeb}
                onClick={handleStopPropagation}
                onChange={handleDesktopWebChange}
              />
              <Monitor size={14} className="text-green-500" /> Desktop Web
            </label>
            <label className="flex items-center gap-2">
              <CheckboxTypeField
                mode="bare"
                checked={!!user.mobileWeb}
                onClick={handleStopPropagation}
                onChange={handleMobileWebChange}
              />
              <MonitorSmartphone size={14} className="text-purple-500" /> Mobile Web
            </label>
          </div>
        ) : (
          <div
            className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded px-2 py-1 transition-colors duration-150 min-w-[120px]"
            onClick={handleDeviceClick}
          >
            {activeDevices.length > 0 ? (
              activeDevices.map((d, i) => (
                <span key={i} className="flex items-center gap-1">
                  {d.icon}
                  <span className="text-sm font-medium">{d.label}</span>
                </span>
              ))
            ) : (
              <span className="text-sm text-gray-400">No Access</span>
            )}
          </div>
        )}
      </td>

      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`
          px-3 py-1 inline-flex items-center text-xs leading-5 font-semibold rounded-full
          ${user.is_approved 
            ? 'bg-green-100 text-green-800 border border-green-200' 
            : 'bg-red-100 text-red-800 border border-red-200'
          }
        `}>
          {user.is_approved ? 'Active' : 'Inactive'}
        </span>
      </td>
      
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center text-sm text-gray-500">
          <Clock className="h-4 w-4 mr-2 text-gray-400" />
          <span>{formatLastActive(user.last_active)}</span>
        </div>
      </td>
      
      <td
        className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"
        onClick={handleStopPropagation}
      >
        <div className="flex items-center justify-end space-x-3">
          {showWalletLink && !bulkDeleteMode ? (
            <button
              onClick={handleWalletClick}
              className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100 transition-colors duration-150"
              title="This account is managed on NBNext Wallet"
            >
              Manage on Wallet
              <ExternalLink size={13} />
            </button>
          ) : !bulkDeleteMode ? (
            <>
              {user.is_approved ? (
                <button
                  onClick={handleDeactivateClick}
                  className="text-yellow-600 hover:text-yellow-800 hover:bg-yellow-50 p-1 rounded transition-colors duration-150"
                  title="Deactivate user"
                >
                  <AlertTriangle size={16} />
                </button>
              ) : (
                <button
                  onClick={handleApproveClick}
                  className="text-green-600 hover:text-green-800 hover:bg-green-50 p-1 rounded transition-colors duration-150"
                  title="Approve user"
                >
                 <UserRoundCheck size={16} />
                </button>
              )}
              <button
                onClick={handleDeleteClick}
                className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1 rounded transition-colors duration-150"
                title="Delete user"
              >
                <Trash2 size={16} />
              </button>
            </>
          ) : (
            <button 
              onClick={handleToggleSelection} 
              className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1 rounded transition-colors duration-150"
              title="Select for deletion"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </td>

      {editField && createPortal(
        <EditFieldModal
          field={editField}
          initialValue={user[editField] ?? ''}
          onSave={(val) => updateUser(user.id, { [editField]: val })}
          onClose={() => setEditField(null)}
        />,
        document.body
      )}
    </tr>
  );
};

UserTableRow.propTypes = {
  user: PropTypes.object.isRequired,
  selectedUsers: PropTypes.array.isRequired,
  bulkDeleteMode: PropTypes.bool.isRequired,
  toggleUserSelection: PropTypes.func.isRequired,
  showConfirmation: PropTypes.func.isRequired,
  formatLastActive: PropTypes.func.isRequired,
  handleRoleChange: PropTypes.func.isRequired,
  handleDeviceOptionUpdate: PropTypes.func.isRequired,
  updateUser: PropTypes.func.isRequired,
  walletUserManagementUrl: PropTypes.string,
  extraColumns: PropTypes.array
};

const UserTableRowMemo = memo(UserTableRow);
export { UserTableRowMemo as UserTableRow };
