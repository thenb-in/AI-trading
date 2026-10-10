const { Op } = require('sequelize');
const logger = require('../../../logger');
const { Subscription, Permission, SubscriptionPermission } = require('../../models');
const { declaredPermissions } = require('../../constants/permissionCatalog');
const { SUBSCRIPTION_STATUS } = require('../../constants/subscription');

// Group every declared master permission by its master, from the catalog —
// the same grouping the subscription screen shows (one row per master). The
// catalog already knows which master a permission belongs to, so no name is
// parsed here.
const masterGroupsByName = () => {
  const groups = new Map();
  for (const permission of declaredPermissions()) {
    if (permission.type !== 'master' || !permission.group) {
      continue;
    }
    if (!groups.has(permission.group)) {
      groups.set(permission.group, []);
    }
    groups.get(permission.group).push(permission.name);
  }
  return groups;
};

// Work out, for one subscription, which permissions each subscribed master is
// missing. A master counts as subscribed when at least one of its permissions
// is; a permission is missing when it has no row at all, so an explicit
// not-subscribed or hidden is never overwritten.
const planForSubscription = (groups, idByName, statusByPermissionId) => {
  const masters = [];
  for (const [master, names] of groups) {
    const ids = names.map((name) => idByName.get(name)).filter(Boolean);
    const masterIsSubscribed = ids.some((id) => statusByPermissionId.get(id) === SUBSCRIPTION_STATUS.SUBSCRIBED);
    if (!masterIsSubscribed) {
      continue;
    }
    const missing = names.filter((name) => {
      const id = idByName.get(name);
      return id && !statusByPermissionId.has(id);
    });
    if (missing.length > 0) {
      masters.push({ master, permissions: missing });
    }
  }
  return masters;
};

/**
 * For every subscription, work out the permissions a subscribed master is
 * missing — the operations (comment/attachment, …) a plan was never updated for
 * after they were added. Returns the full plan (what would be added, by
 * subscription and master) so the caller can show it. With `apply`, it also
 * inserts those rows as `subscribed`; without it, nothing is written.
 *
 * Non-destructive: it only ever adds rows that are absent, so an explicit
 * not-subscribed or hidden a plan has set is left exactly as it is, and a master
 * with nothing subscribed is skipped.
 */
const backfillSubscribedMasters = async ({ apply = false } = {}) => {
  const groups = masterGroupsByName();
  const allNames = [...groups.values()].flat();

  const permissionRows = await Permission.findAll({
    where: { name: { [Op.in]: allNames } },
    attributes: ['id', 'name']
  });
  const idByName = new Map(permissionRows.map((row) => [row.name, row.id]));

  const subscriptions = await Subscription.findAll({ attributes: ['id', 'name'] });
  const plan = [];
  let total = 0;

  for (const subscription of subscriptions) {
    const existing = await SubscriptionPermission.findAll({
      where: { subscription_id: subscription.id },
      attributes: ['permission_id', 'status']
    });
    const statusByPermissionId = new Map(existing.map((row) => [row.permission_id, row.status]));

    const masters = planForSubscription(groups, idByName, statusByPermissionId);
    const added = masters.reduce((sum, entry) => sum + entry.permissions.length, 0);
    if (added === 0) {
      continue;
    }

    if (apply) {
      const rows = masters.flatMap((entry) => entry.permissions.map((name) => ({
        subscription_id: subscription.id,
        permission_id: idByName.get(name),
        status: SUBSCRIPTION_STATUS.SUBSCRIBED
      })));
      await SubscriptionPermission.bulkCreate(rows);
    }

    plan.push({ id: subscription.id, name: subscription.name, added, masters });
    total += added;
  }

  logger.info(`${apply ? 'Backfilled' : 'Previewed'} ${total} missing permission(s) across ${plan.length} subscription(s)`);
  return { applied: apply, total, subscriptions: plan };
};

module.exports = { backfillSubscribedMasters };
