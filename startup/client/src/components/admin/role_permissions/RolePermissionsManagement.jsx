import { useCallback } from 'react';
import { Shield, Plus, Globe, Building2 } from 'lucide-react';
import { Loader } from '@/components/common/Loader';
import { useRolePermissions } from './hooks/useRolePermissions';
import { RoleSelector } from '../RoleSelector';
import { PermissionCategorySection } from './components/PermissionCategorySection';
import { AlertMessage } from './components/AlertMessage';
import { useMasterCreator } from '@startup/components/base_components/master/master_modal/MasterModalProvider';
import { MASTER_TYPE_ROLE } from '../CreateRoleModal';
import { PermissionLegend } from './components/PermissionLegend';
import { organizePermissions, hasNoOrganizedPermissions } from './utils/permissionUtils';
import { useDataContext } from '@context/useDataContext';
  
function RolePermissionsManagement() {
  const { userData } = useDataContext();
  const {
    permissions,
    companySubscriptions,
    selectedRoleId,
    selectedRole,
    loading,
    error,
    updating,
    selectRole,
    togglePermission,
    toggleMultiplePermissions,
    refetch,
    deletePermission,
  } = useRolePermissions();

  // A second way in, beside the picker's own create row: the header button,
  // which opens a blank form rather than one seeded from a search. This screen
  // opened it, so this screen reloads; the picker reloads when next opened.
  const { openMasterModal } = useMasterCreator();
  const handleCreateRole = useCallback(
    () => openMasterModal({ type: MASTER_TYPE_ROLE, onSuccess: refetch }),
    [openMasterModal, refetch]
  );

  const organizedPermissions = organizePermissions(permissions, companySubscriptions, userData);

  if (loading) {
    return <Loader message="Loading roles and permissions..." />;
  }

  return (
    <div className="p-3 max-w-7xl mx-auto">
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900">Roles & Permissions</h1>
          </div>
          <button
            onClick={handleCreateRole}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Role
          </button>
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
        value={selectedRoleId}
        onChange={selectRole}
      />
      
      {selectedRole && (
        <div className="mb-3 flex items-center gap-2 text-xs">
          {selectedRole.isGlobal ? (
            <>
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded">
                <Globe className="w-3 h-3" />
                Global Role
              </span>
              {!userData?.isSupportUser && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-50 text-orange-700 rounded border border-orange-200">
                  <Shield className="w-3 h-3" />
                  Read-Only (Default Roles)
                </span>
              )}
            </>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded">
              <Building2 className="w-3 h-3" />
              Company-Specific Role
            </span>
          )}
        </div>
      )}

      {!selectedRoleId ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-center">
          <p className="text-xs text-yellow-800">
            Please select a role to manage its permissions.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <PermissionLegend isRoleReadOnly={Boolean(selectedRole?.isGlobal) && !userData?.isSupportUser} />

          {/* Module Permissions */}
          {organizedPermissions.module.length > 0 && (
            <PermissionCategorySection
              title="Module Permissions"
              permissions={organizedPermissions.module}
              category="module"
              selectedRole={selectedRole}
              onTogglePermission={togglePermission}
              onToggleOperation={toggleMultiplePermissions}
              userData={userData}
              updating={updating}
              companySubscriptions={companySubscriptions}
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
              userData={userData}
              updating={updating}
              companySubscriptions={companySubscriptions}
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
              userData={userData}
              updating={updating}
              companySubscriptions={companySubscriptions}
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
              companySubscriptions={companySubscriptions}
            />
          )}

          {hasNoOrganizedPermissions(organizedPermissions) && (
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
