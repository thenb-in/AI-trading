const { Subscription } = require('../../models');
const { EXPORTED_SUBSCRIPTION_STATUSES } = require('../../constants/subscription');
const { permissionsInclude, permissionStatusOf, isGlobalSubscription } = require('./helpers');


const exportSubscription = async (subscriptionId) => {
  const subscription = await Subscription.findByPk(subscriptionId, { include: permissionsInclude });
  if (!subscription) {
    throw { status: 404, message: `Subscription ${subscriptionId} not found` };
  }

  const json = subscription.toJSON();
  const permissions = (json.permissions || [])
    .map((p) => ({permission_id:p.id, name: p.name, status: permissionStatusOf(p) }))
    .filter((p) => EXPORTED_SUBSCRIPTION_STATUSES.includes(p.status));

  return {
    id:json.id,
    name: json.name,
    description: json.description || null,
    isGlobal: isGlobalSubscription(subscription),
    permissions
  };
};

module.exports = {
  exportSubscription
};
