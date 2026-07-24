const { sequelize } = require('../databaseService');
const { syncSubscriptionToWallet } = require('./walletSync');
const { applyPermissionStatuses } = require('./helpers');
const { getSubscriptionById } = require('./getSubscription.service');


const updateSubscriptionPermissions = async (subscription_id, permissions = [], auditedBy = null) => {
  const subscription = await getSubscriptionById(subscription_id);
  if (permissions.length === 0) {
    return { message: 'No changes to apply', applied: 0 };
  }

  await sequelize.transaction(async (transaction) => {
    const { allPermissions } = await applyPermissionStatuses(subscription_id, permissions, { transaction });

    await syncSubscriptionToWallet({
      subscription: { id: subscription.id, name: subscription.name, companyId: subscription.companyId },
      permissions: allPermissions,
      action: 'update',
      auditedBy
    });
  });

  return { message: `Successfully updated ${permissions.length} permission(s)`, applied: permissions.length };
};

module.exports = {
  updateSubscriptionPermissions
};
