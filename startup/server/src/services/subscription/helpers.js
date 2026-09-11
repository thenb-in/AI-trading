const { Op } = require('sequelize');
const { Subscription, Permission, SubscriptionPermission } = require('../../models');
const { DEFAULT_SUBSCRIPTION_STATUS, EXPORTED_SUBSCRIPTION_STATUSES } = require('../../constants/subscription');

/**
 * Sequelize `include` that loads a subscription's permissions with their per-subscription status.
 */
const permissionsInclude = [{
  model: Permission,
  as: 'permissions',
  through: { attributes: ['status'], as: 'subscriptionPermission' },
  attributes: ['id', 'name', 'display_name', 'description', 'type']
}];

/** Resolve a loaded permission's status, falling back to the implicit default. */
const permissionStatusOf = (permission) =>
  permission?.subscriptionPermission?.status || DEFAULT_SUBSCRIPTION_STATUS;

/** Whether a subscription is a global (default) one — i.e. not tied to a company. */
const isGlobalSubscription = (subscription) => subscription.companyId === null;

/** Insert-or-update a single (subscription, permission) row to the given status. */
async function upsertSubscriptionPermission(subscriptionId, permissionId, status, transaction = undefined) {
  const [row, created] = await SubscriptionPermission.findOrCreate({
    where: { subscription_id: subscriptionId, permission_id: permissionId },
    defaults: { subscription_id: subscriptionId, permission_id: permissionId, status },
    transaction
  });
  if (!created && row.status !== status) {
    row.status = status;
    await row.save({ transaction });
  }
}

/**
 * Load a subscription's exportable permissions — only `subscribed`/`hidden` rows
 * (the statuses the wallet cares about) — enriched as `[{ id, name, display_name, status }]`.
 */
async function loadSubscriptionPermissions(subscriptionId, transaction) {
  const subscription = await Subscription.findByPk(subscriptionId, { include: permissionsInclude, transaction });
  return (subscription?.permissions || [])
    .map((permission) => ({
      id: permission.id,
      name: permission.name,
      display_name: permission.display_name,
      status: permissionStatusOf(permission)
    }))
    .filter((permission) => EXPORTED_SUBSCRIPTION_STATUSES.includes(permission.status));
}


async function applyPermissionStatuses(subscriptionId, rows, { transaction } = {}) {
  let appliedPermissions = [];
  if (rows.length) {
    const names = rows.map((r) => r.name);
    const found = await Permission.findAll({
      where: { name: names },
      attributes: ['id', 'name', 'display_name'],
      transaction
    });
    if (found.length !== names.length) {
      const foundNames = found.map((p) => p.name);
      const missingNames = names.filter((name) => !foundNames.includes(name));
      throw { status: 404, message: `Permissions not found: ${missingNames.join(', ')}` };
    }
    const byName = new Map(found.map((p) => [p.name, p]));
    for (const { name, status } of rows) {
      await upsertSubscriptionPermission(subscriptionId, byName.get(name).id, status, transaction);
    }
    appliedPermissions = rows.map(({ name, status }) => ({
      id: byName.get(name).id,
      name,
      display_name: byName.get(name).display_name,
      status
    }));
  }

  const allPermissions = await loadSubscriptionPermissions(subscriptionId, transaction);
  return { appliedPermissions, allPermissions };
}

async function resetRemovedPermissions(subscriptionId, keepPermissionIds, transaction) {
  const managed = await SubscriptionPermission.findAll({
    where: { subscription_id: subscriptionId, status: { [Op.in]: EXPORTED_SUBSCRIPTION_STATUSES } },
    transaction
  });
  const toReset = managed.filter((row) => !keepPermissionIds.has(row.permission_id));
  for (const row of toReset) {
    row.status = DEFAULT_SUBSCRIPTION_STATUS;
    await row.save({ transaction });
  }
  return toReset.length;
}


async function upsertSubscription({ id, name, description, companyId }, transaction) {
  const existing = id ? await Subscription.findByPk(id, { transaction }) : null;
  if (!existing) {
    const subscription = await Subscription.create({ name, description, companyId }, { transaction });
    return { subscription, created: true };
  }
  existing.name = name;
  existing.description = description;
  await existing.save({ transaction });
  return { subscription: existing, created: false };
}

module.exports = {
  permissionsInclude,
  permissionStatusOf,
  isGlobalSubscription,
  applyPermissionStatuses,
  resetRemovedPermissions,
  upsertSubscription
};
