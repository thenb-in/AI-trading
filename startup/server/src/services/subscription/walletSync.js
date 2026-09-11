const logger = require('../../../logger');
const env = require('../../config/env');
const userService = require('../userService');
const companyService = require('../companyService');
const { pushSubscriptionToWallet, hasWallet } = require('../../../interfaces/wallet/subscriptionInterface');

async function syncSubscriptionToWallet({ subscription, permissions, action, auditedBy }) {
  if (!subscription) {
    throw { status: 500, message: 'Cannot sync to wallet: subscription is required' };
  }

  if (!hasWallet()) {
    logger.info(`Subscription ${subscription.id} (${action}) saved locally — no wallet configured`);
    return;
  }

  const user = auditedBy ? await userService.getUserById(auditedBy) : null;
  const company = subscription.companyId
    ? await companyService.getCompanyById(subscription.companyId)
    : null;

  const payload = {
    appKey: env.APP_KEY,
    subscriptionId: subscription.id,
    name: subscription.name,
    description: subscription.description ?? null,
    companyId: subscription.companyId,
    companyName: company?.name,
    action,
    permissions: permissions || [],
    auditedBy: user?.name
  };

  await pushSubscriptionToWallet(payload);
  logger.info(`Subscription ${subscription.id} (${action}) synced to wallet`);
}

module.exports = {
  syncSubscriptionToWallet
};
