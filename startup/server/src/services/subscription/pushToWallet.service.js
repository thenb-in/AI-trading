const { Subscription } = require('../../models');
const { applyPermissionStatuses } = require('./helpers');
const { syncSubscriptionToWallet } = require('./walletSync');

/**
 * Push a single existing plan to the wallet as-is (one-time action from the UI).
 * Loads the plan's current subscribed/hidden permissions and syncs them — the
 * user makes no edits; whatever the plan currently is goes to the wallet.
 */
const pushSubscriptionToWalletById = async (subscriptionId, auditedBy = null) => {
  const subscription = await Subscription.findByPk(subscriptionId);
  if (!subscription) {
    throw { status: 404, message: `Subscription ${subscriptionId} not found` };
  }
  const { allPermissions } = await applyPermissionStatuses(subscriptionId, []);
  await syncSubscriptionToWallet({
    subscription,
    permissions: allPermissions,
    action: 'create',
    auditedBy
  });
  return { id: subscription.id, name: subscription.name };
};

module.exports = { pushSubscriptionToWalletById };
