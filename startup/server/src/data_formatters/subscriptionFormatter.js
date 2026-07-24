const formatSubscriptionRow = (companySubscription) => {
  const subscription = companySubscription.subscription.toJSON();
  return {
    ...subscription,
    isGlobal: subscription.company_id === null,
    permissions: (subscription.permissions || []).map((permission) => ({
      ...permission,
      subscriptionStatus: permission.subscriptionPermission?.status || 'not_subscribed'
    }))
  };
};

module.exports = { formatSubscriptionRow };
