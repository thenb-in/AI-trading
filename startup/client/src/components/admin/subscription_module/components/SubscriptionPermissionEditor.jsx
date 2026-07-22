import { useMemo } from 'react';
import PropTypes from 'prop-types';
import { organizePermissions, hasNoOrganizedPermissions } from '../utils/permissionUtils';
import { SubscriptionPermissionSection } from './SubscriptionPermissionSection';

const SECTIONS = [
  { key: 'module', title: 'Module Permissions', category: 'module' },
  { key: 'report', title: 'Report Permissions', category: 'report' },
  { key: 'master', title: 'Master Permissions', category: 'master' },
  { key: 'other', title: 'Other Permissions (Investigation Needed)', category: 'other' },
];

function isNonEmptySection(slice) {
  if (!slice) return false;
  return Array.isArray(slice) ? slice.length > 0 : Object.keys(slice).length > 0;
}

function SubscriptionPermissionEditor({
  permissions,
  getStatus,
  onUpdatePermissionStatus,
  onUpdateMultiplePermissionStatuses,
  updating = false,
  namePrefix = '',
}) {
  const organized = useMemo(() => organizePermissions(permissions), [permissions]);

  // SubscriptionPermissionSection reads each row's status from `selectedSubscription.permissions`.
  const draftSubscription = useMemo(() => ({
    permissions: (permissions || []).map((p) => ({
      ...p,
      subscriptionStatus: getStatus(p.id),
    })),
  }), [permissions, getStatus]);

  if (!permissions || permissions.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded p-3 text-center">
        <p className="text-xs text-gray-600">No permissions available.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {SECTIONS.map(({ key, title, category }) =>
        isNonEmptySection(organized[key]) ? (
          <SubscriptionPermissionSection
            key={key}
            title={title}
            permissions={organized[key]}
            category={category}
            selectedSubscription={draftSubscription}
            onUpdatePermissionStatus={onUpdatePermissionStatus}
            onUpdateMultiplePermissionStatuses={onUpdateMultiplePermissionStatuses}
            updating={updating}
            namePrefix={namePrefix}
          />
        ) : null
      )}

      {hasNoOrganizedPermissions(organized) && (
        <div className="bg-gray-50 border border-gray-200 rounded p-3 text-center">
          <p className="text-xs text-gray-600">No permissions found.</p>
        </div>
      )}
    </div>
  );
}

SubscriptionPermissionEditor.propTypes = {
  permissions: PropTypes.array,
  getStatus: PropTypes.func.isRequired,
  onUpdatePermissionStatus: PropTypes.func.isRequired,
  onUpdateMultiplePermissionStatuses: PropTypes.func.isRequired,
  updating: PropTypes.bool,
  namePrefix: PropTypes.string,
};

export { SubscriptionPermissionEditor };
