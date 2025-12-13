import { Shield, Loader2 } from 'lucide-react';
import { useRolePermissions } from './hooks/useRolePermissions';
import { RoleSelector } from './components/RoleSelector';
import { PermissionCategorySection } from './components/PermissionCategorySection';
import { AlertMessage } from './components/AlertMessage';
import { organizePermissions } from './utils/permissionUtils';
import { useDataContext } from '../../../../context/startup/useDataContext';

function RolePermissionsManagement() {
  const { userData } = useDataContext();
  const {
    roles,
    permissions,
    selectedRoleId,
    selectedRole,
    loading,
    error,
    updating,
    setSelectedRoleId,
    togglePermission,
    toggleMultiplePermissions,
    deletePermission,
  } = useRolePermissions();

  const organizedPermissions = organizePermissions(permissions);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-center">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-xs text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 max-w-7xl mx-auto">
      <div className="mb-3">
        <div className="flex items-center gap-2 mb-1">
          <Shield className="w-5 h-5 text-blue-600" />
          <h1 className="text-xl font-bold text-gray-900">Roles & Permissions</h1>
        </div>
        <p className="text-xs text-gray-600">
          Manage role permissions by selecting a role and toggling permissions below.
        </p>
      </div>

      {error && (
        <div className="mb-3">
          <AlertMessage
            type="error"
            message={error}
            onDismiss={() => window.location.reload()}
          />
        </div>
      )}

      <RoleSelector
        roles={roles}
        selectedRoleId={selectedRoleId}
        onSelect={setSelectedRoleId}
        loading={loading}
      />

      {!selectedRoleId ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-center">
          <p className="text-xs text-yellow-800">
            Please select a role to manage its permissions.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Module Permissions */}
          {organizedPermissions.module.length > 0 && (
            <PermissionCategorySection
              title="Module Permissions"
              permissions={organizedPermissions.module}
              category="module"
              selectedRole={selectedRole}
              onTogglePermission={togglePermission}
              onToggleOperation={toggleMultiplePermissions}
              updating={updating}
            />
          )}

          {/* Report Permissions */}
          {Object.keys(organizedPermissions.report).length > 0 && (
            <PermissionCategorySection
              title="Report Permissions"
              permissions={organizedPermissions.report}
              category="report"
              selectedRole={selectedRole}
              onTogglePermission={togglePermission}
              onToggleOperation={toggleMultiplePermissions}
              updating={updating}
            />
          )}

          {/* Master Permissions */}
          {Object.keys(organizedPermissions.master).length > 0 && (
            <PermissionCategorySection
              title="Master Permissions"
              permissions={organizedPermissions.master}
              category="master"
              selectedRole={selectedRole}
              onTogglePermission={togglePermission}
              onToggleOperation={toggleMultiplePermissions}
              updating={updating}
            />
          )}

          {/* Other Permissions - For Investigation */}
          {organizedPermissions.other && organizedPermissions.other.length > 0 && (
            <PermissionCategorySection
              title="Other Permissions (Investigation Needed)"
              permissions={organizedPermissions.other}
              category="other"
              selectedRole={selectedRole}
              onTogglePermission={togglePermission}
              onToggleOperation={toggleMultiplePermissions}
              onDeletePermission={deletePermission}
              userData={userData}
              updating={updating}
            />
          )}

          {organizedPermissions.module.length === 0 &&
            Object.keys(organizedPermissions.report).length === 0 &&
            Object.keys(organizedPermissions.master).length === 0 &&
            (!organizedPermissions.other || organizedPermissions.other.length === 0) && (
              <div className="bg-gray-50 border border-gray-200 rounded p-3 text-center">
                <p className="text-xs text-gray-600">No permissions found.</p>
              </div>
            )}
        </div>
      )}

      {selectedRole && (
        <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium text-blue-900">
                Managing: <span className="font-semibold">{selectedRole.name}</span>
              </span>
              {selectedRole.description && (
                <span className="text-blue-700 ml-2">{selectedRole.description}</span>
              )}
            </div>
            <span className="text-blue-700">
              {selectedRole.permissions?.length || 0} assigned
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export { RolePermissionsManagement };
