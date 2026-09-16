const { DEFAULT_SUBSCRIPTION_STATUS } = require('../constants/subscription');
const { formatPermission } = require('./permission_formatter');

const formatSubscriptionRow = (companySubscription) => {
  const subscription = companySubscription.subscription.toJSON();
  return {
    ...subscription,
    isGlobal: subscription.company_id === null,
    permissions: (subscription.permissions || []).map((permission) => ({
      ...formatPermission(permission),
      subscriptionStatus: permission.subscriptionPermission?.status || DEFAULT_SUBSCRIPTION_STATUS
    }))
  };
};

module.exports = { formatSubscriptionRow };
