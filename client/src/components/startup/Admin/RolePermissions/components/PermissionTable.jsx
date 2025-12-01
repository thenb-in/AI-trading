import { Loader2 } from 'lucide-react';
import PropTypes from 'prop-types';
import {
  groupMasterPermissionsByOperation,
  groupReportPermissionsByOperation,
  getOperationDisplayName,
  isPermissionAssigned,
} from '../utils/permissionUtils';

export function PermissionTable({
  groups,
  selectedRole,
  onTogglePermission,
  onToggleOperation,
  updating,
  groupByOperation,
}) {
  const groupFunction = groupByOperation === 'master' 
    ? groupMasterPermissionsByOperation 
    : groupReportPermissionsByOperation;

  // Collect all unique operations across all groups
  const allOperations = new Set();
  Object.values(groups).forEach((groupPermissions) => {
    const operationGroups = groupFunction(groupPermissions);
    Object.keys(operationGroups).forEach((op) => allOperations.add(op));
  });
  const operations = Array.from(allOperations).sort();

  // Handler functions for toggle operations
  const handleOperationToggle = (operationPermissions, allOperationAssigned) => {
    const permIds = operationPermissions.map((p) => p.id);
    onToggleOperation(permIds, !allOperationAssigned);
  };

  const handleGroupToggle = (groupPermissions, allGroupAssigned) => {
    const allPermIds = groupPermissions.map((p) => p.id);
    onToggleOperation(allPermIds, !allGroupAssigned);
  };

  const handleFooterOperationToggle = (allOperationPerms, allAssigned) => {
    const permIds = allOperationPerms.map((p) => p.id);
    onToggleOperation(permIds, !allAssigned);
  };

  const handleFooterAllToggle = (allPerms, allAssigned) => {
    const permIds = allPerms.map((p) => p.id);
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
            const allGroupAssigned = groupPermissions.every((p) =>
              isPermissionAssigned(selectedRole, p.id)
            );

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
                  const allOperationAssigned = operationPermissions.length > 0 && 
                    operationPermissions.every((p) => isPermissionAssigned(selectedRole, p.id));
                  const hasPermissions = operationPermissions.length > 0;

                  return (
                    <td
                      key={operation}
                      className="p-1 text-center border-r border-gray-200 last:border-r-0"
                    >
                      {hasPermissions ? (
                        <div className="flex items-center justify-center gap-1">
                          {operationPermissions.map((permission) => {
                            const assigned = isPermissionAssigned(selectedRole, permission.id);
                            return (
                              <input
                                key={permission.id}
                                type="checkbox"
                                checked={assigned}
                                onChange={() => onTogglePermission(permission.id, assigned)}
                                disabled={updating || !selectedRole}
                                className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50 cursor-pointer"
                                title={permission.display_name || permission.name}
                              />
                            );
                          })}
                          {operationPermissions.length > 1 && (
                            <button
                              onClick={() => handleOperationToggle(operationPermissions, allOperationAssigned)}
                              disabled={updating || !selectedRole}
                              className="text-xs text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50 ml-1"
                              title={allOperationAssigned ? 'Deselect all' : 'Select all'}
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
                    disabled={updating || !selectedRole}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
                    title={allGroupAssigned ? 'Deselect all' : 'Select all'}
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
              const allAssigned = allOperationPerms.length > 0 && 
                allOperationPerms.every((p) => isPermissionAssigned(selectedRole, p.id));

              return (
                <td key={operation} className="p-1 text-center border-r border-gray-200 last:border-r-0">
                  {allOperationPerms.length > 0 ? (
                    <button
                      onClick={() => handleFooterOperationToggle(allOperationPerms, allAssigned)}
                      disabled={updating || !selectedRole}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
                      title={allAssigned ? 'Deselect all' : 'Select all'}
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
                const allAssigned = allPerms.length > 0 && 
                  allPerms.every((p) => isPermissionAssigned(selectedRole, p.id));
                return (
                  <button
                    onClick={() => handleFooterAllToggle(allPerms, allAssigned)}
                    disabled={updating || !selectedRole}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
                    title={allAssigned ? 'Deselect all' : 'Select all'}
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
};

