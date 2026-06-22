const razorpayService = require('../razorpay/razorpay.service');
const subscriptionService = require('../services/subscription.service');
const { SUBSCRIBED_STATUS } = require('../constants/onboarding/onboarding.constants');

const getPublicPlans = async () => {
  const subscriptions = await subscriptionService.getGlobalPlansWithPermissions();
  const { amount, currency } = razorpayService.getDefaultPricing();

  return subscriptions.map((subscription) => {
    const json = subscription.toJSON();
    const permissions = (json.permissions || [])
      .filter((perm) => perm.subscriptionPermission?.status === SUBSCRIBED_STATUS)
      .map((perm) => ({
        id: perm.id,
        name: perm.name,
        display_name: perm.display_name,
        description: perm.description,
        type: perm.type
      }));

    return {
      id: json.id,
      name: json.name,
      description: json.description || null,
      amount,
      currency,
      permissions
    };
  });
};

module.exports = { getPublicPlans };
