import { CheckboxTypeField } from '@startup/components/base_components/fields/CheckboxTypeField';
import { useCallback } from 'react';
import { Layers, Trash2 } from 'lucide-react';
import PropTypes from 'prop-types';
import {
  isPermissionAssigned,
  getPermissionSubscriptionStatus,
  getPermissionLabel,
  isUndeclaredPermission,
  categoryTotals,
} from '../utils/permissionUtils';
import { PermissionTable } from './PermissionTable';
import { CategoryCard, SelectAllButton } from './CategoryCard';
import { hasPermission } from '@startup/hooks/hasPermission';
import { PERMISSION_CATEGORY_ICONS, PERMISSION_CATEGORY_COLORS, UNDECLARED_PERMISSION_STYLES } from '../../permissionCategoryStyles';

function PermissionCategorySection({
  title,
  permissions,
  category,
  selectedRole,
  onTogglePermission,
  onToggleOperation,
  onDeletePermission,
  userData,
  updating,
  companySubscriptions,
}) {
  // Check if the role is read-only (default role and user is not superadmin)
  const isRoleReadOnly = selectedRole?.isGlobal && !userData?.isSupportUser;

  // Handler for individual permission toggle
  const handlePermissionToggle = useCallback((permission_id, isAssigned) => {
    onTogglePermission(permission_id, isAssigned);
  }, [onTogglePermission]);

  // Grant or revoke the whole category. Only the matrix categories hand over a
  // grouped object rather than a list, and they have no such control.
  const handleCategoryToggle = useCallback(() => {
    if (!Array.isArray(permissions)) return;
    const { subscribed, allAssigned } = categoryTotals(permissions, selectedRole, companySubscriptions);
    if (subscribed.length === 0) return;
    onToggleOperation(subscribed.map((permission) => permission.id), !allAssigned);
  }, [permissions, selectedRole, onToggleOperation, companySubscriptions]);

  // Deleting the permissions no constant declares — one, or a whole master's
  // worth from its row header. The names go in the prompt so whoever is
  // clearing up sees exactly which rows leave the database.
  const handleDeleteUndeclared = useCallback((permissionsToDelete) => {
    const names = permissionsToDelete.map((permission) => permission.name).join(', ');
    const confirmed = window.confirm(
      `Delete ${permissionsToDelete.length} permission(s) that no constant declares — ${names}? ` +
      `They will be removed from every role that holds them. This cannot be undone.`
    );
    if (confirmed) {
      onDeletePermission(permissionsToDelete.map((permission) => permission.id));
    }
  }, [onDeletePermission]);

  const canDeletePermission = hasPermission('delete_permission', userData);

  // Validate permissions based on category type
  let hasPermissions = false;
  if (category === 'master' || category === 'report') {
    // For master and report, permissions is an object (grouped)
    hasPermissions = permissions && typeof permissions === 'object' && !Array.isArray(permissions) && Object.keys(permissions).length > 0;
  } else {
    // For module and other, permissions is an array
    hasPermissions = permissions && Array.isArray(permissions) && permissions.length > 0;
  }

  if (!hasPermissions) {
    return null;
  }

  const Icon = PERMISSION_CATEGORY_ICONS[category] || Layers;
  const colorClass = PERMISSION_CATEGORY_COLORS[category] || 'bg-gray-50 border-gray-200';

  // For master and report permissions (grouped by entity/report) - use table view
  if (category === 'master' || category === 'report') {
    const totalCount = Object.values(permissions).reduce((sum, perms) => sum + perms.length, 0);
    
    return (
      <CategoryCard
        icon={Icon}
        title={title}
        colorClass={colorClass}
        summary={`${totalCount} permissions`}
      >
        <PermissionTable
          groups={permissions}
          selectedRole={selectedRole}
          onTogglePermission={handlePermissionToggle}
          onToggleOperation={onToggleOperation}
          onDeleteUndeclared={handleDeleteUndeclared}
          canDeletePermission={canDeletePermission}
          updating={updating}
          groupByOperation={category}
          userData={userData}
          companySubscriptions={companySubscriptions}
        />
      </CategoryCard>
    );
  }

  // For "other" category - detailed table view with all information
  if (category === 'other') {
    const { assignedCount, allAssigned, hasSubscribed } = categoryTotals(permissions, selectedRole, companySubscriptions);

    return (
      <CategoryCard
        icon={Icon}
        title={title}
        colorClass={colorClass}
        badge={(
          <span className="text-xs text-yellow-700 bg-yellow-100 px-1.5 py-0.5 rounded">
            Investigation Needed
          </span>
        )}
        summary={`${assignedCount}/${permissions.length}`}
        toggle={permissions.length > 0 && (
          <SelectAllButton
            onToggle={handleCategoryToggle}
            allAssigned={allAssigned}
            hasSubscribed={hasSubscribed}
            isRoleReadOnly={isRoleReadOnly}
            updating={updating}
            disabled={!selectedRole}
          />
        )}
      >
        <div className="overflow-x-auto border border-gray-200 rounded bg-white">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50 border-b-2 border-gray-300">
                <th className="text-left p-1.5 font-semibold text-gray-700 border-r border-gray-200">Checkbox</th>
                <th className="text-left p-1.5 font-semibold text-gray-700 border-r border-gray-200">ID</th>
                <th className="text-left p-1.5 font-semibold text-gray-700 border-r border-gray-200">Name</th>
                <th className="text-left p-1.5 font-semibold text-gray-700 border-r border-gray-200">Display Name</th>
                <th className="text-left p-1.5 font-semibold text-gray-700 border-r border-gray-200">Description</th>
                <th className={`text-left p-1.5 font-semibold text-gray-700 ${canDeletePermission ? 'border-r border-gray-200' : ''}`}>Type</th>
                {canDeletePermission && (
                  <th className="text-center p-1.5 font-semibold text-gray-700">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {permissions.map((permission) => {
                const assigned = isPermissionAssigned(selectedRole, permission.id);
                const subscriptionStatus = getPermissionSubscriptionStatus(companySubscriptions, permission.id);
                const isHidden = subscriptionStatus === 'hidden';
                // Hidden means subscribed but hidden - enable for superadmins
                const isSubscribed = subscriptionStatus === 'subscribed' || (isHidden && userData?.isSupportUser);
                const isDisabled = updating || !selectedRole || isRoleReadOnly || !isSubscribed;
                const tooltipText = !isSubscribed 
                  ? `You don't have subscription to use this permission. Upgrade to use.`
                  : isHidden && userData?.isSupportUser
                    ? `${getPermissionLabel(permission)} (Hidden permission - visible to superadmins only)`
                    : isRoleReadOnly 
                      ? `${getPermissionLabel(permission)} (Read-only: Only superadmins can modify default roles)` 
                      : getPermissionLabel(permission);
                
                return (
                  <tr
                    key={permission.id}
                    className={`border-b border-gray-200 hover:bg-gray-50 ${
                      isUndeclaredPermission(permission) ? UNDECLARED_PERMISSION_STYLES.tint : ''
                    }`}
                  >
                    <td className="p-1.5 text-center border-r border-gray-200">
                      <CheckboxTypeField
                        mode="bare"
                        checked={assigned}
                        onChange={() => handlePermissionToggle(permission.id, assigned)}
                        disabled={isDisabled}
                        className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50 cursor-pointer"
                        title={tooltipText}
                      />
                    </td>
                    <td className="p-1.5 text-gray-700 border-r border-gray-200 font-mono text-xs">{permission.id}</td>
                    <td className={`p-1.5 border-r border-gray-200 font-mono text-xs ${isUndeclaredPermission(permission) ? UNDECLARED_PERMISSION_STYLES.text : 'text-gray-700'}`}>{permission.name || '—'}</td>
                    <td className="p-1.5 text-gray-700 border-r border-gray-200">{permission.display_name || '—'}</td>
                    <td className="p-1.5 text-gray-600 border-r border-gray-200">{permission.description || '—'}</td>
                    <td className={`p-1.5 text-gray-700 ${canDeletePermission ? 'border-r border-gray-200' : ''}`}>{permission.type || '—'}</td>
                    {canDeletePermission && (
                      <td className="p-1.5 text-center">
                        {isUndeclaredPermission(permission) && (
                          <button
                            onClick={() => handleDeleteUndeclared([permission])}
                            disabled={updating}
                            className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            title={`Delete ${permission.name} — no constant declares this permission`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CategoryCard>
    );
  }

  // For module permissions - simple list view
  const { assignedCount, allAssigned, hasSubscribed } = categoryTotals(permissions, selectedRole, companySubscriptions);

  return (
    <CategoryCard
      icon={Icon}
      title={title}
      colorClass={colorClass}
      summary={`${assignedCount}/${permissions.length}`}
      toggle={permissions.length > 0 && (
        <SelectAllButton
          onToggle={handleCategoryToggle}
          allAssigned={allAssigned}
          hasSubscribed={hasSubscribed}
          isRoleReadOnly={isRoleReadOnly}
          updating={updating}
          disabled={!selectedRole}
        />
      )}
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-1">
        {permissions.map((permission) => {
          const assigned = isPermissionAssigned(selectedRole, permission.id);
          const subscriptionStatus = getPermissionSubscriptionStatus(companySubscriptions, permission.id);
          const isHidden = subscriptionStatus === 'hidden';
          // Hidden means subscribed but hidden - enable for superadmins
          const isSubscribed = subscriptionStatus === 'subscribed' || (isHidden && userData?.isSupportUser);
          const isDisabled = updating || !selectedRole || isRoleReadOnly || !isSubscribed;
          const tooltipText = !isSubscribed 
            ? `You don't have subscription to use this permission. Upgrade to use.`
            : isHidden && userData?.isSupportUser
              ? 'Hidden permission - visible to superadmins only'
              : isRoleReadOnly 
                ? 'Read-only: Only superadmins can modify default roles' 
                : '';
          
          const isUndeclared = isUndeclaredPermission(permission);

          return (
            <div
              key={permission.id}
              className={`flex items-center gap-1 p-1 rounded border hover:border-blue-300 ${
                isUndeclared
                  ? `${UNDECLARED_PERMISSION_STYLES.tint} ${UNDECLARED_PERMISSION_STYLES.border}`
                  : 'bg-white border-gray-200'
              }`}
            >
              <label
                className={`flex items-center gap-1 flex-1 min-w-0 ${isDisabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                title={tooltipText || getPermissionLabel(permission)}
              >
                <CheckboxTypeField
                  mode="bare"
                  checked={assigned}
                  onChange={() => handlePermissionToggle(permission.id, assigned)}
                  disabled={isDisabled}
                  className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
                />
                <span className={`text-xs truncate flex-1 ${isUndeclared ? UNDECLARED_PERMISSION_STYLES.text : 'text-gray-700'}`}>
                  {getPermissionLabel(permission)}
                </span>
              </label>
              {canDeletePermission && isUndeclared && (
                <button
                  onClick={() => handleDeleteUndeclared([permission])}
                  disabled={updating}
                  className="p-0.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                  title={`Delete ${permission.name} — no constant declares this permission`}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </CategoryCard>
  );
}

PermissionCategorySection.propTypes = {
  title: PropTypes.string.isRequired,
  permissions: PropTypes.oneOfType([
    PropTypes.array,
    PropTypes.object,
  ]).isRequired,
  category: PropTypes.oneOf(['module', 'report', 'master', 'other']).isRequired,
  selectedRole: PropTypes.object,
  onTogglePermission: PropTypes.func.isRequired,
  onToggleOperation: PropTypes.func.isRequired,
  onDeletePermission: PropTypes.func,
  userData: PropTypes.object,
  updating: PropTypes.bool,
  companySubscriptions: PropTypes.array,
};

export { PermissionCategorySection };
