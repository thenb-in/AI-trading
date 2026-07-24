const logger = require('../../../logger');
const { sequelize } = require('../databaseService');
const { applyPermissionStatuses, resetRemovedPermissions, upsertSubscription } = require('./helpers');
const { syncSubscriptionToWallet } = require('./walletSync');

/**
 * Import a subscription from the portable export shape,.
 */
const importSubscription = async (payload, requestCompanyId, auditedBy = null) => {
  const { id, name, description = null, isGlobal, permissions } = payload;
  const scope = isGlobal ? null : requestCompanyId;

  const { subscription, created, reset } = await sequelize.transaction(async (transaction) => {
    const { subscription, created } = await upsertSubscription({ id, name, description, companyId: scope }, transaction);

    // Drop permissions the import no longer grants, then apply the incoming set.
    const keepPermissionIds = new Set(permissions.map((p) => p.permission_id));
    const reset = await resetRemovedPermissions(subscription.id, keepPermissionIds, transaction);
    const { allPermissions } = await applyPermissionStatuses(subscription.id, permissions, { transaction });

    await syncSubscriptionToWallet({
      subscription: { id: subscription.id, name: subscription.name, companyId: subscription.companyId },
      permissions: allPermissions,
      action: created ? 'create' : 'update',
      auditedBy
    });

    return { subscription, created, reset };
  });

  logger.info(`Imported subscription "${name}" (${created ? 'created' : 'replaced'}): applied ${permissions.length}, reset ${reset}`);

  return {
    subscription,
    created,
    applied: permissions.length,
    reset
  };
};

module.exports = {
  importSubscription
};
