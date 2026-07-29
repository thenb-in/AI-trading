const logger = require('../../../logger');
const env = require('../../config/env');
const userService = require('../userService');
const companyService = require('../companyService');
const { pushSubscriptionToWallet } = require('../../../interfaces/wallet/subscriptionInterface');

async function syncSubscriptionToWallet({ subscription, permissions, action, auditedBy }) {
  if (!subscription) {
    throw { status: 500, message: 'Cannot sync to wallet: subscription is required' };
  }
  const user = await userService.getUserById(auditedBy);
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

  const result = await pushSubscriptionToWallet(payload);
  if (result?.skipped) {
    logger.info(`Subscription ${subscription.id} (${action}) saved locally — no wallet configured`);
    return;
  }
  logger.info(`Subscription ${subscription.id} (${action}) synced to wallet`);
}

module.exports = {
  syncSubscriptionToWallet
};
