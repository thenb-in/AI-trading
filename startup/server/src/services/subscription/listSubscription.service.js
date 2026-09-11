const { Op } = require('sequelize');
const logger = require('../../../logger');
const env = require('../../config/env');
const { Subscription } = require('../../models');
const { permissionsInclude, permissionStatusOf, isGlobalSubscription } = require('./helpers');
const { fetchAvailableSubscriptionsFromWallet, hasWallet } = require('../../../interfaces/wallet/subscriptionInterface');


const getPushedPlanIds = async (companyId) => {
  if (!hasWallet()) {
    return new Set();
  }
  try {
    const available = await fetchAvailableSubscriptionsFromWallet(env.APP_KEY, companyId);
    return new Set(available.map((plan) => plan.id));
  } catch (error) {
    logger.warn(`Could not fetch pushed plans from wallet: ${error.message}`);
    return new Set();
  }
};

/** All subscriptions visible to a company (its own + global), each with its permission statuses. */
const getSubscriptionsAndPermissions = async (companyId) => {
  try {
    const subscriptions = await Subscription.findAll({
      where: {
        [Op.or]: [
          { companyId: null },
          { companyId: companyId }
        ]
      },
      include: permissionsInclude,
      order: [['name', 'ASC']]
    });

    const pushedIds = await getPushedPlanIds(companyId);
    const walletEnabled = hasWallet();

    return subscriptions.map((subscription) => {
      const subscriptionJson = subscription.toJSON();
      const permissionsWithStatus = subscriptionJson.permissions.map((perm) => ({
        ...perm,
        subscriptionStatus: permissionStatusOf(perm)
      }));

      return {
        ...subscriptionJson,
        isGlobal: isGlobalSubscription(subscription),
        pushed: pushedIds.has(subscription.id),
        walletEnabled,
        permissions: permissionsWithStatus
      };
    });
  } catch (error) {
    throw { status: 500, message: error.message };
  }
};

/**
 * Global (public) plans with the permissions each one marks, for the self-serve
 * signup catalogue. Returns raw Subscription instances; callers shape them.
 */
const getGlobalPlansWithPermissions = async () => {
  return Subscription.findAll({
    where: { companyId: null },
    include: permissionsInclude,
    order: [['name', 'ASC']]
  });
};

module.exports = {
  getSubscriptionsAndPermissions,
  getGlobalPlansWithPermissions
};
