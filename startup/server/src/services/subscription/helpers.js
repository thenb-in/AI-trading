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
    const ids = rows.map((r) => r.permission_id);
    const found = await Permission.findAll({
      where: { id: ids },
      attributes: ['id', 'name', 'display_name'],
      transaction
    });
    if (found.length !== ids.length) {
      const foundIds = found.map((p) => p.id);
      const missingIds = ids.filter((id) => !foundIds.includes(id));
      throw { status: 404, message: `Permissions with ids ${missingIds.join(', ')} not found` };
    }
    const metaById = new Map(found.map((p) => [p.id, { name: p.name, display_name: p.display_name }]));
    for (const { permission_id, status } of rows) {
      await upsertSubscriptionPermission(subscriptionId, permission_id, status, transaction);
    }
    appliedPermissions = rows.map(({ permission_id, status }) => ({
      id: permission_id,
      name: metaById.get(permission_id)?.name || null,
      display_name: metaById.get(permission_id)?.display_name || null,
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
