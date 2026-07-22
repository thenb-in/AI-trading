import { useCallback, useMemo } from 'react';
import { Layers } from 'lucide-react';
import PropTypes from 'prop-types';
import { getSubscriptionPermissionStatus } from '../utils/permissionUtils';
import { PERMISSION_CATEGORY_ICONS, PERMISSION_CATEGORY_COLORS } from '../../permissionCategoryStyles';

function getEntityKeyFromPermissionName(permissionName) {
  if (!permissionName) return 'Other';
  const name = String(permissionName).toLowerCase();

  const prefixes = [
    'deactivate_',
    'approve_',
    'create_',
    'read_',
    'update_',
    'delete_',
    'view_',
    'download_',
    'export_',
    'import_',
    'reject_',
  ];

  let entity = name;
  for (const prefix of prefixes) {
    if (entity.startsWith(prefix)) {
      entity = entity.slice(prefix.length);
      break;
    }
  }

  entity = entity.replace(/_module$/, '');

  return (
    entity
      .split('_')
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ') || 'Other'
  );
}

function getGroupStatus(subscription, permissionIds) {
  if (!subscription || !Array.isArray(permissionIds) || permissionIds.length === 0) {
    return 'not_subscribed';
  }

  const statuses = permissionIds.map((id) => getSubscriptionPermissionStatus(subscription, id));
  const unique = Array.from(new Set(statuses));
  if (unique.length === 1) return unique[0];
  return 'mixed';
}

function SubscriptionPermissionSection({
  title,
  permissions,
  category,
  selectedSubscription,
  onUpdatePermissionStatus,
  onUpdateMultiplePermissionStatuses,
  updating,
  namePrefix = '',
}) {
  // Handler for individual permission status update
  const handlePermissionStatusChange = useCallback((permission_id, status) => {
    onUpdatePermissionStatus(permission_id, status);
  }, [onUpdatePermissionStatus]);

  // Validate permissions based on category type
  let hasPermissions = false;
  if (category === 'master' || category === 'report') {
    // For master and report, permissions is an object (grouped)
    hasPermissions = permissions && typeof permissions === 'object' && !Array.isArray(permissions) && Object.keys(permissions).length > 0;
  } else {
    // For module and other, permissions is an array
    hasPermissions = permissions && Array.isArray(permissions) && permissions.length > 0;
  }

  const Icon = PERMISSION_CATEGORY_ICONS[category] || Layers;
  const colorClass = PERMISSION_CATEGORY_COLORS[category] || 'bg-gray-50 border-gray-200';

  const groupedRows = useMemo(() => {
    if (category === 'master' || category === 'report') {
      return Object.entries(permissions)
        .map(([groupKey, groupPermissions]) => {
          const permissionIds = Array.isArray(groupPermissions) ? groupPermissions.map((p) => p.id) : [];
          const first = Array.isArray(groupPermissions) && groupPermissions.length > 0 ? groupPermissions[0] : null;
          return {
            key: groupKey,
            name: groupKey,
            description: first?.description || '—',
            permissionIds,
            total: permissionIds.length,
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name));
    }

    if (Array.isArray(permissions)) {
      const map = new Map();
      permissions.forEach((p) => {
        const groupKey = getEntityKeyFromPermissionName(p.name || p.display_name);
        const existing = map.get(groupKey);
        if (!existing) {
          map.set(groupKey, {
            key: groupKey,
            name: groupKey,
            description: p.description || '—',
            permissionIds: [p.id],
            total: 1,
          });
          return;
        }
        existing.permissionIds.push(p.id);
        existing.total += 1;
        if ((existing.description === '—' || !existing.description) && p.description) {
          existing.description = p.description;
        }
      });

      return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
    }

    return [];
  }, [category, permissions]);

  const totalCount = useMemo(
    () => groupedRows.reduce((sum, r) => sum + (r.total || 0), 0),
    [groupedRows]
  );

  // Collect all permission IDs for this category
  const allPermissionIds = useMemo(() => {
    const ids = [];
    groupedRows.forEach((row) => {
      if (Array.isArray(row.permissionIds)) {
        ids.push(...row.permissionIds);
      }
    });
    return ids;
  }, [groupedRows]);

  // Handler for bulk status update
  const handleBulkStatusChange = useCallback((status) => {
    if (allPermissionIds.length === 0) return;
    onUpdateMultiplePermissionStatuses(allPermissionIds, status);
  }, [allPermissionIds, onUpdateMultiplePermissionStatuses]);

  const bulkButtonsDisabled = updating || !selectedSubscription || allPermissionIds.length === 0;

  if (!hasPermissions) {
    return null;
  }

  return (
    <div className={`border rounded p-2 ${colorClass}`}>
      <div className="flex items-center gap-1.5 mb-2">
        <Icon className="w-4 h-4 text-gray-700" />
        <h3 className="text-xs font-semibold text-gray-900">{title}</h3>
        <span className="text-xs text-gray-600">
          {totalCount} permissions
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => handleBulkStatusChange('subscribed')}
            disabled={bulkButtonsDisabled}
            className="px-2 py-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Subscribe All
          </button>
          <button
            onClick={() => handleBulkStatusChange('not_subscribed')}
            disabled={bulkButtonsDisabled}
            className="px-2 py-1 text-xs font-medium text-white bg-gray-600 hover:bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Not Subscribed All
          </button>
          <button
            onClick={() => handleBulkStatusChange('hidden')}
            disabled={bulkButtonsDisabled}
            className="px-2 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Hidden All
          </button>
        </div>
      </div>

      <div className="overflow-x-auto border border-gray-200 rounded bg-white">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-gray-50 border-b-2 border-gray-300">
              <th className="text-left p-1.5 font-semibold text-gray-700 border-r border-gray-200">Name</th>
              {category === 'other' && (
                <th className="text-left p-1.5 font-semibold text-gray-700 border-r border-gray-200">Description</th>
              )}
              <th className="text-center p-1.5 font-semibold text-gray-700 border-r border-gray-200">Subscribe</th>
              <th className="text-center p-1.5 font-semibold text-gray-700 border-r border-gray-200">Not Subscribed</th>
              <th className="text-center p-1.5 font-semibold text-gray-700">Hidden</th>
            </tr>
          </thead>
          <tbody>
            {groupedRows.map((row) => {
              const currentStatus = getGroupStatus(selectedSubscription, row.permissionIds);
              const disabled =
                updating ||
                !selectedSubscription ||
                !Array.isArray(row.permissionIds) ||
                row.permissionIds.length === 0;

              const updateGroup = (status) => {
                if (row.permissionIds.length === 1) {
                  handlePermissionStatusChange(row.permissionIds[0], status);
                  return;
                }
                onUpdateMultiplePermissionStatuses(row.permissionIds, status);
              };

              return (
                <tr key={row.key} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="p-1.5 text-gray-700 border-r border-gray-200 font-medium">
                    <div className="flex items-center gap-2">
                      <span>{row.name}</span>
                    </div>
                  </td>
                  {category === 'other' && (
                    <td className="p-1.5 text-gray-600 border-r border-gray-200">
                      {row.description || '—'}
                    </td>
                  )}
                  <td className="p-1.5 text-center border-r border-gray-200">
                    <input
                      type="radio"
                      name={`permission-group-${namePrefix}${category}-${row.key}`}
                      value="subscribed"
                      checked={currentStatus === 'subscribed'}
                      onChange={() => updateGroup('subscribed')}
                      disabled={disabled}
                      className="w-3.5 h-3.5 text-blue-600 border-gray-300 focus:ring-blue-500 disabled:opacity-50 cursor-pointer"
                    />
                  </td>
                  <td className="p-1.5 text-center border-r border-gray-200">
                    <input
                      type="radio"
                      name={`permission-group-${namePrefix}${category}-${row.key}`}
                      value="not_subscribed"
                      checked={currentStatus === 'not_subscribed'}
                      onChange={() => updateGroup('not_subscribed')}
                      disabled={disabled}
                      className="w-3.5 h-3.5 text-blue-600 border-gray-300 focus:ring-blue-500 disabled:opacity-50 cursor-pointer"
                    />
                  </td>
                  <td className="p-1.5 text-center">
                    <input
                      type="radio"
                      name={`permission-group-${namePrefix}${category}-${row.key}`}
                      value="hidden"
                      checked={currentStatus === 'hidden'}
                      onChange={() => updateGroup('hidden')}
                      disabled={disabled}
                      className="w-3.5 h-3.5 text-blue-600 border-gray-300 focus:ring-blue-500 disabled:opacity-50 cursor-pointer"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

SubscriptionPermissionSection.propTypes = {
  title: PropTypes.string.isRequired,
  permissions: PropTypes.oneOfType([
    PropTypes.array,
    PropTypes.object,
  ]).isRequired,
  category: PropTypes.oneOf(['module', 'report', 'master', 'other']).isRequired,
  selectedSubscription: PropTypes.object,
  onUpdatePermissionStatus: PropTypes.func.isRequired,
  onUpdateMultiplePermissionStatuses: PropTypes.func.isRequired,
  updating: PropTypes.bool,
  namePrefix: PropTypes.string,
};

export { SubscriptionPermissionSection };

