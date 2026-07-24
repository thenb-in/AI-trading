const { Subscription } = require('../../models');

/**
 * Fetch a single global/public plan by id, or throw if it doesn't exist or is a
 * company-specific subscription. `options` is forwarded to the query (e.g. a
 * transaction) so callers can run it inside their own transaction.
 */
const getGlobalPlanById = async (subscriptionId, options = {}) => {
  const subscription = await Subscription.findByPk(subscriptionId, options);
  if (!subscription || subscription.companyId !== null) {
    throw { status: 404, message: 'Selected plan is not available' };
  }
  return subscription;
};

/**
 * Find a subscription by its exact name within a scope (companyId null = global).
 * Returns the subscription, or null if none exists in that scope.
 */
const getSubscriptionByName = async (name, companyId = null) => {
  return Subscription.findOne({ where: { name: name.trim(), companyId: companyId || null } });
};

/**
 * Fetch a subscription by id, throwing 404 if it doesn't exist. `options` is forwarded to the
 * query (e.g. a transaction) so callers can run it inside their own transaction.
 */
const getSubscriptionById = async (subscriptionId, options = {}) => {
  const subscription = await Subscription.findByPk(subscriptionId, options);
  if (!subscription) {
    throw { status: 404, message: 'Subscription not found' };
  }
  return subscription;
};

module.exports = {
  getGlobalPlanById,
  getSubscriptionByName,
  getSubscriptionById
};
