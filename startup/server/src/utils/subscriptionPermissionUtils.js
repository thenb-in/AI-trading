const logger = require('../../logger');
const companySubscriptionService = require('../services/companySubscription.service');
const { SUBSCRIPTION_STATUS } = require('../constants/subscription');

/**
 * Narrow a user's role permissions to the ones their company's subscriptions
 * actually grant. A support user also keeps `hidden` permissions — the ones a
 * plan carries but does not show to the company.
 *
 * A company we cannot read subscriptions for keeps nothing: a permission the
 * plan may not include must not be granted because a lookup failed.
 */
const verifyValidSubscribedPermission = async (user, activeCompanyId) => {
  if (!activeCompanyId) {
    logger.warn(`No active company for user ${user.id}: leaving their permissions unfiltered`);
    return user;
  }

  const grantedStatuses = user.isSupportUser
    ? [SUBSCRIPTION_STATUS.SUBSCRIBED, SUBSCRIPTION_STATUS.HIDDEN]
    : [SUBSCRIPTION_STATUS.SUBSCRIBED];

  try {
    const subscriptions = await companySubscriptionService.getCompanySubscriptions(activeCompanyId);
    const grantedIds = new Set(
      subscriptions.flatMap((subscription) => (subscription.permissions || [])
        .filter((permission) => grantedStatuses.includes(permission.subscriptionStatus))
        .map((permission) => permission.id))
    );

    const rolePermissions = user.role?.permissions || [];
    const granted = rolePermissions.filter((permission) => grantedIds.has(permission.id));
    logger.debug(`User ${user.id}: ${granted.length} of ${rolePermissions.length} role permissions are subscribed for company ${activeCompanyId}`);
    if (user.role) {
      user.role.permissions = granted;
    }
    return user;
  } catch (error) {
    logger.error(`Could not check subscribed permissions for user ${user.id} in company ${activeCompanyId}: ${error.message}`, error);
    if (user.role) {
      user.role.permissions = [];
    }
    return user;
  }
};

module.exports = {
  verifyValidSubscribedPermission
};
