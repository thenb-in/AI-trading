const logger = require('../../logger');
const companySubscriptionService = require('../services/companySubscription.service');

/**
 * Verify and filter user permissions based on subscription status
 * - If user is superadmin (isSupportUser = true): includes both 'subscribed' and 'hidden' permissions
 * - If user is not superadmin: includes only 'subscribed' permissions
 */
const verifyValidSubscribedPermission = async (user, activeCompanyId) => {
  try {
    if (!activeCompanyId) {
      logger.warn(`No active company found for user ${user.id}, returning user without permission filtering`);
      return user;
    }

    // Get company subscriptions with permission statuses
    const companySubscriptions = await companySubscriptionService.getCompanySubscriptions(activeCompanyId);
    logger.info(`Found ${companySubscriptions.length} subscriptions for company ${activeCompanyId}`);

    // Create a map of permission ID to subscription status
    // Priority: subscribed > not_subscribed > hidden
    const permissionStatusMap = new Map();

    companySubscriptions.forEach(subscription => {
      if (subscription.permissions && Array.isArray(subscription.permissions)) {
        subscription.permissions.forEach(permission => {
          const permissionId = permission.id;
          const currentStatus = permissionStatusMap.get(permissionId);
          const newStatus = permission.subscriptionStatus || 'not_subscribed';

          // Priority: subscribed > not_subscribed > hidden
          if (!currentStatus || currentStatus === 'not_subscribed') {
            permissionStatusMap.set(permissionId, newStatus);
          } else if (currentStatus === 'hidden' && newStatus === 'subscribed') {
            permissionStatusMap.set(permissionId, newStatus);
          } else if (currentStatus === 'hidden' && newStatus === 'not_subscribed') {
            // Keep hidden if already set
            permissionStatusMap.set(permissionId, currentStatus);
          }
        });
      }
    });

    // Filter user's role permissions based on subscription status
    if (user.role && user.role.permissions && Array.isArray(user.role.permissions)) {
      const isSuperAdmin = user.isSupportUser === true;
      const originalPermissionCount = user.role.permissions.length;
      const filteredPermissions = user.role.permissions.filter(permission => {
        // Handle both Sequelize instances and plain objects
        const permissionId = permission.id || permission.dataValues?.id || permission.get?.('id');
        if (!permissionId) {
          logger.warn(`Permission without ID found for user ${user.id}, skipping`);
          return false;
        }

        const subscriptionStatus = permissionStatusMap.get(permissionId) || 'not_subscribed';

        // If user is superadmin, include both subscribed and hidden permissions
        if (isSuperAdmin) {
          return subscriptionStatus === 'subscribed' || subscriptionStatus === 'hidden';
        }

        // If user is not superadmin, include only subscribed permissions
        return subscriptionStatus === 'subscribed';
      });

      // Update user's role permissions with filtered list
      // Convert to plain objects if they're Sequelize instances
      user.role.permissions = filteredPermissions.map(perm => {
        if (perm && typeof perm.get === 'function') {
          // It's a Sequelize instance, convert to plain object
          return perm.get({ plain: true });
        }
        return perm;
      });

      logger.info(`Filtered permissions for user ${user.id}: ${filteredPermissions.length} out of ${originalPermissionCount} permissions (isSupportUser: ${isSuperAdmin})`);
      logger.info(`Permission status map size: ${permissionStatusMap.size}, User role permissions count: ${originalPermissionCount}`);
    }

    return user;
  } catch (error) {
    logger.error(`Error verifying subscribed permissions for user ${user.id}: ${error.message}`, error);
    // Return user without filtering if there's an error
    return user;
  }
};

module.exports = {
  verifyValidSubscribedPermission
};

