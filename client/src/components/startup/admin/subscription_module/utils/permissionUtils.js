import { organizePermissions } from '../../role_permissions/utils/permissionUtils';

/**
 * Gets the subscription status for a permission
 * @param {Object} subscription - The subscription object
 * @param {number} permission_id - The permission ID
 * @returns {string} The status: 'subscribed', 'not_subscribed', or 'hidden'
 */
function getSubscriptionPermissionStatus(subscription, permission_id) {
  if (!subscription || !subscription.permissions) return 'not_subscribed';
  const permission = subscription.permissions.find((p) => p.id === permission_id);
  return permission?.subscriptionStatus || 'not_subscribed';
}

export {
  organizePermissions,
  getSubscriptionPermissionStatus
};

