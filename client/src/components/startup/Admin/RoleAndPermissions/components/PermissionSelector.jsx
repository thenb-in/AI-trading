import PropTypes from 'prop-types';

const PermissionSelector = ({ 
  allPermissions, 
  selectedPermissions, 
  onPermissionToggle 
}) => {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-3">
        Select Permissions
      </label>
      <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-xl p-4 bg-white shadow-sm">
        {allPermissions.map(permission => (
          <div key={permission.id} className="py-3 border-b border-gray-100 last:border-b-0">
            <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors">
              <input
                type="checkbox"
                checked={selectedPermissions.includes(permission.id)}
                onChange={() => onPermissionToggle(permission.id)}
                className="mr-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
              />
              <span className="text-sm text-gray-700 font-medium">
                {permission.name}
              </span>
            </label>
          </div>
        ))}
      </div>
      <div className="mt-2 text-xs text-gray-500">
        {selectedPermissions.length} of {allPermissions.length} permissions selected
      </div>
    </div>
  );
};

PermissionSelector.propTypes = {
  allPermissions: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      name: PropTypes.string.isRequired,
      description: PropTypes.string
    })
  ).isRequired,
  selectedPermissions: PropTypes.arrayOf(
    PropTypes.oneOfType([PropTypes.string, PropTypes.number])
  ).isRequired,
  onPermissionToggle: PropTypes.func.isRequired
};

export { PermissionSelector };
