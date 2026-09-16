import { CheckboxTypeField } from '@startup/components/base_components/fields/CheckboxTypeField';
import { Loader2, Link2 } from 'lucide-react';
import PropTypes from 'prop-types';
import {
  groupMasterPermissionsByOperation,
  groupReportPermissionsByOperation,
  getOperationDisplayName,
  getPermissionLabel,
  isPermissionAssigned,
  isLinkedPermission,
  getPermissionSubscriptionStatus,
} from '../utils/permissionUtils';

function PermissionTable({
  groups,
  selectedRole,
  onTogglePermission,
  onToggleOperation,
  updating,
  groupByOperation,
  userData,
  companySubscriptions,
}) {
  // Check if the role is read-only (default role and user is not superadmin)
  const isRoleReadOnly = selectedRole?.isGlobal && !userData?.isSupportUser;

  const groupFunction = groupByOperation === 'master' 
    ? groupMasterPermissionsByOperation 
    : groupReportPermissionsByOperation;

  // Collect all unique operations across all groups
  const allOperations = new Set();
  Object.values(groups).forEach((groupPermissions) => {
    const operationGroups = groupFunction(groupPermissions);
    Object.keys(operationGroups).forEach((op) => allOperations.add(op));
  });
  
  // Sort operations: CRUD first (create, read, update, delete), then others alphabetically
  const crudOrder = ['create', 'read', 'update', 'delete'];
  const operations = Array.from(allOperations).sort((a, b) => {
    const aIndex = crudOrder.indexOf(a);
    const bIndex = crudOrder.indexOf(b);
    
    // If both are CRUD operations, sort by CRUD order
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }
    // If only 'a' is CRUD, it comes first
    if (aIndex !== -1) {
      return -1;
    }
    // If only 'b' is CRUD, it comes first
    if (bIndex !== -1) {
      return 1;
    }
    // Both are non-CRUD, sort alphabetically
    return a.localeCompare(b);
  });

  // Helper function to filter subscribed permissions
  const getSubscribedPermissions = (permissionsList) => {
    return permissionsList.filter((p) => {
      const status = getPermissionSubscriptionStatus(companySubscriptions, p.id);
      return status === 'subscribed';
    });
  };

  // Handler functions for toggle operations
  const handleOperationToggle = (operationPermissions, allOperationAssigned) => {
    // Only toggle subscribed permissions
    const subscribedPerms = getSubscribedPermissions(operationPermissions);
    if (subscribedPerms.length === 0) return;
    const permIds = subscribedPerms.map((p) => p.id);
    onToggleOperation(permIds, !allOperationAssigned);
  };

  const handleGroupToggle = (groupPermissions, allGroupAssigned) => {
    // Only toggle subscribed permissions
    const subscribedPerms = getSubscribedPermissions(groupPermissions);
    if (subscribedPerms.length === 0) return;
    const allPermIds = subscribedPerms.map((p) => p.id);
    onToggleOperation(allPermIds, !allGroupAssigned);
  };

  const handleFooterOperationToggle = (allOperationPerms, allAssigned) => {
    // Only toggle subscribed permissions
    const subscribedPerms = getSubscribedPermissions(allOperationPerms);
    if (subscribedPerms.length === 0) return;
    const permIds = subscribedPerms.map((p) => p.id);
    onToggleOperation(permIds, !allAssigned);
  };

  const handleFooterAllToggle = (allPerms, allAssigned) => {
    // Only toggle subscribed permissions
    const subscribedPerms = getSubscribedPermissions(allPerms);
    if (subscribedPerms.length === 0) return;
    const permIds = subscribedPerms.map((p) => p.id);
    onToggleOperation(permIds, !allAssigned);
  };

  if (Object.keys(groups).length === 0) {
    return null;
  }

  return (
    <div className="overflow-x-auto border border-gray-200 rounded">
      <table className="w-full border-collapse text-xs bg-white">
        <thead>
          <tr className="bg-gray-50 border-b-2 border-gray-300">
            <th className="text-left p-1.5 font-semibold text-gray-700 sticky left-0 bg-gray-50 z-20 border-r border-gray-200 min-w-[120px]">
              Entity / Report
            </th>
            {operations.map((operation) => (
              <th
                key={operation}
                className="text-center p-1.5 font-semibold text-gray-700 border-r border-gray-200 last:border-r-0"
              >
                {getOperationDisplayName(operation)}
              </th>
            ))}
            <th className="text-center p-1.5 font-semibold text-gray-700 w-16">
              All
            </th>
          </tr>
        </thead>
        <tbody>
          {Object.keys(groups).sort().map((groupName) => {
            const groupPermissions = groups[groupName];
            const operationGroups = groupFunction(groupPermissions);
            // Only check subscribed permissions for "all assigned" status
            const subscribedGroupPermissions = groupPermissions.filter((p) => {
              const status = getPermissionSubscriptionStatus(companySubscriptions, p.id);
              return status === 'subscribed';
            });
            const allGroupAssigned = subscribedGroupPermissions.length > 0 && subscribedGroupPermissions.every((p) =>
              isPermissionAssigned(selectedRole, p.id)
            );
            const hasSubscribedInGroup = subscribedGroupPermissions.length > 0;

            return (
              <tr
                key={groupName}
                className="border-b border-gray-200 hover:bg-gray-50"
              >
                <td className="p-1.5 font-medium text-gray-800 sticky left-0 bg-white z-10 border-r border-gray-200 whitespace-nowrap">
                  {groupName}
                </td>
                {operations.map((operation) => {
                  const operationPermissions = operationGroups[operation] || [];
                  // Only check subscribed permissions for "all assigned" status
                  const subscribedOperationPermissions = operationPermissions.filter((p) => {
                    const status = getPermissionSubscriptionStatus(companySubscriptions, p.id);
                    return status === 'subscribed';
                  });
                  const allOperationAssigned = subscribedOperationPermissions.length > 0 && 
                    subscribedOperationPermissions.every((p) => isPermissionAssigned(selectedRole, p.id));
                  const hasPermissions = operationPermissions.length > 0;
                  const hasSubscribedInOperation = subscribedOperationPermissions.length > 0;

                  return (
                    <td
                      key={operation}
                      className="p-1 text-center border-r border-gray-200 last:border-r-0"
                    >
                      {hasPermissions ? (
                        <div className="flex items-center justify-center gap-1 flex-wrap">
                          {operationPermissions.map((permission, index) => {
                            const assigned = isPermissionAssigned(selectedRole, permission.id);
                            const isLinked = isLinkedPermission(permission);
                            const subscriptionStatus = getPermissionSubscriptionStatus(companySubscriptions, permission.id);
                            const isHidden = subscriptionStatus === 'hidden';
                            // Hidden means subscribed but hidden - enable for superadmins
                            const isSubscribed = subscriptionStatus === 'subscribed' || (isHidden && userData?.isSupportUser);
                            const isDisabled = updating || !selectedRole || isRoleReadOnly || !isSubscribed;
                            const displayName = getPermissionLabel(permission) || 'Unknown Permission';
                            let tooltipText = isLinked 
                              ? `${displayName} (Linked to Module Permission - toggling this will also toggle the module permission)`
                              : displayName;
                            
                            if (!isSubscribed) {
                              tooltipText = `You don't have subscription to use this permission. Upgrade to use.`;
                            } else if (isHidden && userData?.isSupportUser) {
                              tooltipText = `${tooltipText} (Hidden permission - visible to superadmins only)`;
                            } else if (isRoleReadOnly) {
                              tooltipText = `${tooltipText} (Read-only: Only superadmins can modify default roles)`;
                            }
                            
                            return (
                              <div key={`${permission.id}-${index}`} className="flex items-center gap-0.5">
                                <CheckboxTypeField
                                  mode="bare"
                                  checked={assigned}
                                  onChange={() => onTogglePermission(permission.id, assigned)}
                                  disabled={isDisabled}
                                  className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50 cursor-pointer"
                                  title={tooltipText}
                                />
                                {isLinked && (
                                  <Link2 
                                    className="w-2.5 h-2.5 text-blue-500 flex-shrink-0" 
                                    title="This permission is linked to a module permission"
                                  />
                                )}
                              </div>
                            );
                          })}
                          {operationPermissions.length > 1 && (
                            <button
                              onClick={() => handleOperationToggle(operationPermissions, allOperationAssigned)}
                              disabled={updating || !selectedRole || isRoleReadOnly || !hasSubscribedInOperation}
                              className="text-xs text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50 ml-1"
                              title={
                                !hasSubscribedInOperation 
                                  ? 'No subscribed permissions available' 
                                  : isRoleReadOnly 
                                    ? 'Read-only: Only superadmins can modify default roles' 
                                    : (allOperationAssigned ? 'Deselect all' : 'Select all')
                              }
                            >
                              {updating ? (
                                <Loader2 className="w-2.5 h-2.5 animate-spin" />
                              ) : allOperationAssigned ? (
                                '✕'
                              ) : (
                                '✓'
                              )}
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  );
                })}
                <td className="p-1 text-center">
                  <button
                    onClick={() => handleGroupToggle(groupPermissions, allGroupAssigned)}
                    disabled={updating || !selectedRole || isRoleReadOnly || !hasSubscribedInGroup}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
                    title={
                      !hasSubscribedInGroup 
                        ? 'No subscribed permissions available' 
                        : isRoleReadOnly 
                          ? 'Read-only: Only superadmins can modify default roles' 
                          : (allGroupAssigned ? 'Deselect all' : 'Select all')
                    }
                  >
                    {updating ? (
                      <Loader2 className="w-3 h-3 animate-spin mx-auto" />
                    ) : allGroupAssigned ? (
                      '✕'
                    ) : (
                      '✓'
                    )}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-gray-50 border-t-2 border-gray-300">
            <td className="p-1.5 font-semibold text-gray-700 sticky left-0 bg-gray-50 z-10 border-r border-gray-200">
              All
            </td>
            {operations.map((operation) => {
              // Get all permissions for this operation across all groups
              const allOperationPerms = [];
              Object.values(groups).forEach((groupPermissions) => {
                const operationGroups = groupFunction(groupPermissions);
                if (operationGroups[operation]) {
                  allOperationPerms.push(...operationGroups[operation]);
                }
              });
              // Only check subscribed permissions for "all assigned" status
              const subscribedOperationPerms = allOperationPerms.filter((p) => {
                const status = getPermissionSubscriptionStatus(companySubscriptions, p.id);
                return status === 'subscribed';
              });
              const allAssigned = subscribedOperationPerms.length > 0 && 
                subscribedOperationPerms.every((p) => isPermissionAssigned(selectedRole, p.id));
              const hasSubscribedInOperation = subscribedOperationPerms.length > 0;

              return (
                <td key={operation} className="p-1 text-center border-r border-gray-200 last:border-r-0">
                  {allOperationPerms.length > 0 ? (
                    <button
                      onClick={() => handleFooterOperationToggle(allOperationPerms, allAssigned)}
                      disabled={updating || !selectedRole || isRoleReadOnly || !hasSubscribedInOperation}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
                      title={
                        !hasSubscribedInOperation 
                          ? 'No subscribed permissions available' 
                          : isRoleReadOnly 
                            ? 'Read-only: Only superadmins can modify default roles' 
                            : (allAssigned ? 'Deselect all' : 'Select all')
                      }
                    >
                      {updating ? (
                        <Loader2 className="w-2.5 h-2.5 animate-spin mx-auto" />
                      ) : allAssigned ? (
                        '✕'
                      ) : (
                        '✓'
                      )}
                    </button>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
              );
            })}
            <td className="p-1 text-center">
              {/* Select all for entire category */}
              {(() => {
                const allPerms = Object.values(groups).flat();
                // Only check subscribed permissions for "all assigned" status
                const subscribedAllPerms = allPerms.filter((p) => {
                  const status = getPermissionSubscriptionStatus(companySubscriptions, p.id);
                  return status === 'subscribed';
                });
                const allAssigned = subscribedAllPerms.length > 0 && 
                  subscribedAllPerms.every((p) => isPermissionAssigned(selectedRole, p.id));
                const hasSubscribedAll = subscribedAllPerms.length > 0;
                return (
                  <button
                    onClick={() => handleFooterAllToggle(allPerms, allAssigned)}
                    disabled={updating || !selectedRole || isRoleReadOnly || !hasSubscribedAll}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
                    title={
                      !hasSubscribedAll 
                        ? 'No subscribed permissions available' 
                        : isRoleReadOnly 
                          ? 'Read-only: Only superadmins can modify default roles' 
                          : (allAssigned ? 'Deselect all' : 'Select all')
                    }
                  >
                    {updating ? (
                      <Loader2 className="w-3 h-3 animate-spin mx-auto" />
                    ) : allAssigned ? (
                      '✕'
                    ) : (
                      '✓'
                    )}
                  </button>
                );
              })()}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

PermissionTable.propTypes = {
  groups: PropTypes.object.isRequired,
  selectedRole: PropTypes.object,
  onTogglePermission: PropTypes.func.isRequired,
  onToggleOperation: PropTypes.func.isRequired,
  updating: PropTypes.bool,
  groupByOperation: PropTypes.oneOf(['master', 'report']).isRequired,
  userData: PropTypes.object,
  companySubscriptions: PropTypes.array,
};

export { PermissionTable };
