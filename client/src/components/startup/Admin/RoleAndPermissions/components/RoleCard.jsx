import { Trash2, Users } from 'lucide-react';
import PropTypes from 'prop-types';
import { getRolePermissionCount } from '../utils/rolePermissionUtils';

const RoleCard = ({ role, onRemovePermission }) => {
  const permissionCount = getRolePermissionCount(role);

  return (
    <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"></div>
          <h4 className="font-semibold text-gray-900 text-lg">{role.name}</h4>
        </div>
        <div className="text-sm text-gray-500">
          {permissionCount} permissions
        </div>
      </div>
      
      {role.permissions && role.permissions.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {role.permissions.map(permission => (
            <div key={permission.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3 border border-gray-200 hover:bg-gray-100 transition-colors">
              <span className="text-sm text-gray-700 font-medium">
                {permission.name}
              </span>
              <button
                onClick={() => onRemovePermission(role.id, permission.id)}
                className="text-red-500 hover:text-red-700 p-1 rounded-md hover:bg-red-50 transition-colors"
                title="Remove permission"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center text-gray-500 italic py-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <Users className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p>No permissions assigned</p>
        </div>
      )}
    </div>
  );
};

RoleCard.propTypes = {
  role: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    name: PropTypes.string.isRequired,
    description: PropTypes.string,
    permissions: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
        name: PropTypes.string.isRequired,
        description: PropTypes.string
      })
    )
  }).isRequired,
  onRemovePermission: PropTypes.func.isRequired
};

export { RoleCard };
