const logger = require('../../logger');
const companySubscriptionService = require('../services/companySubscription.service');

/**
 * Check if a company has at least one active subscription that includes the
 * given permission with status === 'subscribed'.
 *
 * This is the service-layer equivalent of the route-level requirePermission
 * check: routes are already gated by role+subscription via requirePermission,
 * but background and auto-triggered code paths (auto-sync loops, post-commit
 * employee sync, webhook handlers) bypass Express middleware and must check
 * subscriptions directly before generating commands.
 *
 * @param {string} companyId
 * @param {string} permissionName
 * @returns {Promise<boolean>}
 */
async function companyHasPermission(companyId, permissionName) {
  if (!companyId || !permissionName) {
    return false;
  }
  try {
    const subscriptions = await companySubscriptionService.getCompanySubscriptions(companyId);
    for (const sub of subscriptions) {
      if (!Array.isArray(sub.permissions)) {
        continue;
      }
      for (const perm of sub.permissions) {
        if (perm.name === permissionName && perm.subscriptionStatus === 'subscribed') {
          return true;
        }
      }
    }
    return false;
  } catch (error) {
    logger.error(
      `companyHasPermission: error checking ${permissionName} for company=${companyId}: ${error.message}`,
      error
    );
    return false;
  }
}

module.exports = {
  companyHasPermission
};
