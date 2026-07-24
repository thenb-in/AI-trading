const logger = require('../../../logger');
const { sequelize } = require('../databaseService');
const { Subscription } = require('../../models');
const { syncSubscriptionToWallet } = require('./walletSync');
const { applyPermissionStatuses } = require('./helpers');
const { getSubscriptionByName } = require('./getSubscription.service');


const createSubscription = async (name, description = null, scope = null, permissions = [], auditedBy = null) => {
  // Reject duplicates within the same scope.
  const existingSubscription = await getSubscriptionByName(name, scope);
  if (existingSubscription) {
    throw new Error(`Subscription with name "${name}" already exists as a ${scope ? 'company-specific' : 'global'} subscription`);
  }


  const newSubscription = await sequelize.transaction(async (transaction) => {
    const subscription = await Subscription.create({
      name,
      description,
      companyId: scope
    }, { transaction });

    const { allPermissions } = await applyPermissionStatuses(subscription.id, permissions, { transaction });

    logger.info(`Created subscription "${name}" with companyId: ${scope || 'null (global)'} and ${permissions.length} permission row(s)`);

    await syncSubscriptionToWallet({
      subscription: { id: subscription.id, name: subscription.name, companyId: scope},
      permissions: allPermissions,
      action: 'create',
      auditedBy
    });

    return subscription;
  });

  return newSubscription;
};

module.exports = {
  createSubscription
};
