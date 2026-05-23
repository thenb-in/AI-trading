const { Op } = require('sequelize');
const logger = require('../../logger');
const { Subscription, Permission, SubscriptionPermission } = require('../models');
const { validateName, validateDescription } = require('../utils/modelHelpers');

const EXPORTABLE_STATUSES = ['subscribed', 'hidden'];
const ALL_STATUSES = ['subscribed', 'not_subscribed', 'hidden'];

const validatePayload = (payload) => {
  if (!payload || typeof payload !== 'object') {
    throw { status: 400, message: 'Invalid import payload' };
  }
  const { name, description, isGlobal, permissions } = payload;
  if (!Array.isArray(permissions)) {
    throw { status: 400, message: 'permissions must be an array' };
  }
  for (const entry of permissions) {
    if (!entry || typeof entry.name !== 'string' || !entry.name.trim()) {
      throw { status: 400, message: 'Each permission must have a non-empty name' };
    }
    if (!ALL_STATUSES.includes(entry.status)) {
      throw { status: 400, message: `Invalid status "${entry.status}" for permission "${entry.name}"` };
    }
  }
  return {
    name: validateName(name, { fieldName: 'Subscription name' }),
    description: validateDescription(description),
    isGlobal: !!isGlobal,
    permissions
  };
};

const resolvePermissionsByName = async (permissions) => {
  const names = permissions.map(p => p.name);
  const records = names.length
    ? await Permission.findAll({ where: { name: names } })
    : [];
  const byName = new Map(records.map(p => [p.name, p]));
  const missing = names.filter(n => !byName.has(n));
  if (missing.length) {
    throw { status: 400, message: `Permissions not found: ${missing.join(', ')}` };
  }
  return byName;
};

const findOrCreateSubscription = async (name, description, companyId) => {
  let subscription = await Subscription.findOne({ where: { name, companyId } });
  if (!subscription) {
    subscription = await Subscription.create({ name, description, companyId });
    return { subscription, created: true };
  }
  if (description !== undefined && description !== subscription.description) {
    subscription.description = description;
    await subscription.save();
  }
  return { subscription, created: false };
};

const upsertStatus = async (subscriptionId, permissionId, status) => {
  const [row, created] = await SubscriptionPermission.findOrCreate({
    where: { subscription_id: subscriptionId, permission_id: permissionId },
    defaults: { subscription_id: subscriptionId, permission_id: permissionId, status }
  });
  if (!created) {
    row.status = status;
    await row.save();
  }
};

const resetRemovedPermissions = async (subscriptionId, incomingPermissionIds) => {
  const existing = await SubscriptionPermission.findAll({
    where: {
      subscription_id: subscriptionId,
      status: { [Op.in]: EXPORTABLE_STATUSES }
    }
  });
  const toReset = existing.filter(m => !incomingPermissionIds.has(m.permission_id));
  for (const row of toReset) {
    row.status = 'not_subscribed';
    await row.save();
  }
  return toReset.length;
};

const importSubscription = async (payload, requestCompanyId) => {
  const validated = validatePayload(payload);
  const companyId = validated.isGlobal ? null : requestCompanyId;
  const permByName = await resolvePermissionsByName(validated.permissions);

  const { subscription, created } = await findOrCreateSubscription(
    validated.name,
    validated.description,
    companyId
  );

  const incomingPermissionIds = new Set();
  for (const { name: permName, status } of validated.permissions) {
    const perm = permByName.get(permName);
    incomingPermissionIds.add(perm.id);
    await upsertStatus(subscription.id, perm.id, status);
  }

  const resetCount = await resetRemovedPermissions(subscription.id, incomingPermissionIds);

  const action = created ? 'created' : 'replaced';
  logger.info(`Imported subscription ${validated.name} (${action}): applied ${validated.permissions.length}, reset ${resetCount}`);

  return {
    subscription,
    created,
    applied: validated.permissions.length,
    reset: resetCount
  };
};

module.exports = {
  importSubscription
};
