import { memo, useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Trash2, Clock, AlertTriangle, Monitor, Smartphone, MonitorSmartphone, UserRoundCheck,Globe } from 'lucide-react';
import RoleBadge from './RoleBadge';

const UserTableRow = ({ 
  user, 
  roles,
  selectedUsers, 
  bulkDeleteMode, 
  toggleUserSelection, 
  showConfirmation, 
  formatLastActive,
  handleRoleChange,
  handleDeviceOptionUpdate,
  extraColumns = []
}) => {
  const [editingRole, setEditingRole] = useState(false);
  const [editingDevice, setEditingDevice] = useState(false);

  const roleSelectRef = useRef(null);
  const deviceRef = useRef(null);

  const isSelected = selectedUsers.includes(user.id);

  const handleRowClick = () => {
    if (bulkDeleteMode) {
      toggleUserSelection(user.id);
    }
  };

  const onRoleChange = async (e) => {
    const newRoleId = e.target.value;
    await handleRoleChange(user.id, newRoleId);
    setEditingRole(false);
  };

  const onDeviceChange = async (key, value) => {
    await handleDeviceOptionUpdate(user.id, key, value);
  };

  // Collect active device access
  const activeDevices = [];
  if (user.mobileApp) activeDevices.push({ label: 'Mobile App', icon: <Smartphone size={14} className="text-blue-500" /> });
  if (user.desktopWeb) activeDevices.push({ label: 'Desktop Web', icon: <Monitor size={14} className="text-green-500" /> });
  if (user.mobileWeb) activeDevices.push({ label: 'Mobile Web', icon: <Globe size={14} className="text-purple-500" /> });

  useEffect(() => {
    if (editingRole && roleSelectRef.current) {
      roleSelectRef.current.focus();
      roleSelectRef.current.click();
    }
  }, [editingRole]);

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
          <input
            type="checkbox"
            checked={isSelected}
            onClick={(e) => e.stopPropagation()}
            onChange={() => toggleUserSelection(user.id)}
            className="form-checkbox h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
          />
        </td>
      )}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-medium text-gray-900">{user.name}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-500">{user.username}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {editingRole ? (
          <select
            ref={roleSelectRef}
            value={user.role.id}
            onChange={onRoleChange}
            onBlur={() => setEditingRole(false)} 
            onClick={(e) => e.stopPropagation()}
            className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="" disabled>
              Select Role
            </option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        ) : (
          <div
            className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded px-2 py-1 transition-colors duration-150"
            onClick={(e) => {
              e.stopPropagation();
              setEditingRole(true);
            }}
          >
            <RoleBadge role={user.role.name} />
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
              <input
                type="checkbox"
                checked={!!user.mobileApp}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => onDeviceChange('mobileApp', e.target.checked)}
              />
              <Smartphone size={14} className="text-blue-500" /> Mobile App
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!user.desktopWeb}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => onDeviceChange('desktopWeb', e.target.checked)}
              />
              <Monitor size={14} className="text-green-500" /> Desktop Web
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!user.mobileWeb}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => onDeviceChange('mobileWeb', e.target.checked)}
              />
              <MonitorSmartphone size={14} className="text-purple-500" /> Mobile Web
            </label>
          </div>
        ) : (
          <div
            className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded px-2 py-1 transition-colors duration-150 min-w-[120px]"
            onClick={(e) => {
              e.stopPropagation();
              setEditingDevice(true);
            }}
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
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-end space-x-3">
          {!bulkDeleteMode ? (
            <>
              {user.is_approved ? (
                <button
                  onClick={() => showConfirmation(user.id, 'deactivate', user.name)}
                  className="text-yellow-600 hover:text-yellow-800 hover:bg-yellow-50 p-1 rounded transition-colors duration-150"
                  title="Deactivate user"
                >
                  <AlertTriangle size={16} />
                </button>
              ) : (
                <button
                  onClick={() => showConfirmation(user.id, 'approve', user.name)}
                  className="text-green-600 hover:text-green-800 hover:bg-green-50 p-1 rounded transition-colors duration-150"
                  title="Approve user"
                >
                 <UserRoundCheck size={16} />
                </button>
              )}
              <button
                onClick={() => showConfirmation(user.id, 'delete', user.name)}
                className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1 rounded transition-colors duration-150"
                title="Delete user"
              >
                <Trash2 size={16} />
              </button>
            </>
          ) : (
            <button 
              onClick={() => toggleUserSelection(user.id)} 
              className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1 rounded transition-colors duration-150"
              title="Select for deletion"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
};

UserTableRow.propTypes = {
  user: PropTypes.object.isRequired,
  roles: PropTypes.array.isRequired,
  selectedUsers: PropTypes.array.isRequired,
  bulkDeleteMode: PropTypes.bool.isRequired,
  toggleUserSelection: PropTypes.func.isRequired,
  showConfirmation: PropTypes.func.isRequired,
  formatLastActive: PropTypes.func.isRequired,
  handleRoleChange: PropTypes.func.isRequired,
  handleDeviceOptionUpdate: PropTypes.func.isRequired,
  extraColumns: PropTypes.array
};

export default memo(UserTableRow);
