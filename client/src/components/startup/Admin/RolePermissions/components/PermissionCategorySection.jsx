import { useCallback } from 'react';
import { Layers, FileText, Database, Loader2 } from 'lucide-react';
import PropTypes from 'prop-types';
import { isPermissionAssigned } from '../utils/permissionUtils';
import { PermissionTable } from './PermissionTable';

const categoryIcons = {
  module: Layers,
  report: FileText,
  master: Database,
};

const categoryColors = {
  module: 'bg-blue-50 border-blue-200',
  report: 'bg-purple-50 border-purple-200',
  master: 'bg-green-50 border-green-200',
};

export function PermissionCategorySection({
  title,
  permissions,
  category,
  selectedRole,
  onTogglePermission,
  onToggleOperation,
  updating,
}) {

  // Handler for individual permission toggle
  const handlePermissionToggle = useCallback((permissionId, isAssigned) => {
    onTogglePermission(permissionId, isAssigned);
  }, [onTogglePermission]);

  // Handler for category-level toggle (module/report)
  const handleCategoryToggle = useCallback(() => {
    if (!Array.isArray(permissions)) return;
    const allPermIds = permissions.map((p) => p.id);
    const allAssigned = allPermIds.every((id) =>
      isPermissionAssigned(selectedRole, id)
    );
    onToggleOperation(allPermIds, !allAssigned);
  }, [permissions, selectedRole, onToggleOperation]);

  // Validate permissions based on category type
  let hasPermissions = false;
  if (category === 'master' || category === 'report') {
    // For master and report, permissions is an object (grouped)
    hasPermissions = permissions && typeof permissions === 'object' && !Array.isArray(permissions) && Object.keys(permissions).length > 0;
  } else {
    // For module, permissions is an array
    hasPermissions = permissions && Array.isArray(permissions) && permissions.length > 0;
  }

  if (!hasPermissions) {
    return null;
  }

  const Icon = categoryIcons[category] || Layers;
  const colorClass = categoryColors[category] || 'bg-gray-50 border-gray-200';

  // For master and report permissions (grouped by entity/report) - use table view
  if (category === 'master' || category === 'report') {
    const totalCount = Object.values(permissions).reduce((sum, perms) => sum + perms.length, 0);
    
    return (
      <div className={`border rounded p-2 ${colorClass}`}>
        <div className="flex items-center gap-1.5 mb-2">
          <Icon className="w-4 h-4 text-gray-700" />
          <h3 className="text-xs font-semibold text-gray-900">{title}</h3>
          <span className="ml-auto text-xs text-gray-600">
            {totalCount} permissions
          </span>
        </div>

        <PermissionTable
          groups={permissions}
          selectedRole={selectedRole}
          onTogglePermission={handlePermissionToggle}
          onToggleOperation={onToggleOperation}
          updating={updating}
          groupByOperation={category}
        />
      </div>
    );
  }

  // For module permissions - simple list view
  const assignedCount = permissions.filter((p) =>
    isPermissionAssigned(selectedRole, p.id)
  ).length;
  const allCategoryAssigned = permissions.length > 0 && permissions.every((p) =>
    isPermissionAssigned(selectedRole, p.id)
  );

  return (
    <div className={`border rounded p-2 ${colorClass}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Icon className="w-4 h-4 text-gray-700" />
          <h3 className="text-xs font-semibold text-gray-900">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600">
            {assignedCount}/{permissions.length}
          </span>
          {permissions.length > 0 && (
            <button
              onClick={handleCategoryToggle}
              disabled={updating || !selectedRole}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
            >
              {updating ? (
                <Loader2 className="w-3 h-3 animate-spin inline" />
              ) : allCategoryAssigned ? (
                'Deselect All'
              ) : (
                'Select All'
              )}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-1">
        {permissions.map((permission) => {
          const assigned = isPermissionAssigned(selectedRole, permission.id);
          return (
            <label
              key={permission.id}
              className="flex items-center gap-1 p-1 bg-white rounded border border-gray-200 hover:border-blue-300 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={assigned}
                onChange={() => handlePermissionToggle(permission.id, assigned)}
                disabled={updating || !selectedRole}
                className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
              />
              <span className="text-xs text-gray-700 truncate flex-1">
                {permission.display_name || permission.name}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

PermissionCategorySection.propTypes = {
  title: PropTypes.string.isRequired,
  permissions: PropTypes.oneOfType([
    PropTypes.array,
    PropTypes.object,
  ]).isRequired,
  category: PropTypes.oneOf(['module', 'report', 'master']).isRequired,
  selectedRole: PropTypes.object,
  onTogglePermission: PropTypes.func.isRequired,
  onToggleOperation: PropTypes.func.isRequired,
  updating: PropTypes.bool,
};

