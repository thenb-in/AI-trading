const { Op } = require('sequelize');
const logger = require('../../logger');
const { Subscription, Permission, User,SubscriptionPermission } = require('../models');
const { findModelByIdOrThrow, validateName, validateDescription } = require('../utils/modelHelpers');
const { importSubscription } = require('./subscription.import');

const EXPORT_VISIBLE_STATUSES = ['subscribed', 'hidden'];

const checkSubscriptionExists = async (name, companyId = null) => {
  const whereClause = { name: name.trim() };
  if (companyId) {
    whereClause.companyId = companyId;
  } else {
    whereClause.companyId = null;
  }
  const existingSubscription = await Subscription.findOne({ where: whereClause });
  return existingSubscription;
};

const createSubscription = async (name, description, companyId = null) => {
  const trimmedName = validateName(name, { fieldName: 'Subscription name' });
  const trimmedDescription = validateDescription(description);

  // Check for duplicate
  const existingSubscription = await checkSubscriptionExists(trimmedName, companyId);
  if (existingSubscription) {
    const subscriptionType = companyId ? 'company-specific' : 'global';
    throw new Error(`Subscription with name "${trimmedName}" already exists as a ${subscriptionType} subscription`);
  }

  // Create the subscription
  const newSubscription = await Subscription.create({
    name: trimmedName,
    description: trimmedDescription,
    companyId: companyId
  });

  logger.info(`Created subscription "${trimmedName}" with companyId: ${companyId || 'null (global)'}`);
  return newSubscription;
};

const getSubscriptionsAndPermissions = async (companyId) => {
  try {
    // All users see global subscriptions + company-specific subscriptions
    const whereClause = {
      [Op.or]: [
        { companyId: null }, // Global subscriptions (visible to all users)
        { companyId: companyId } // Company-specific subscriptions
      ]
    };

    const subscriptions = await Subscription.findAll({
      where: whereClause,
      include: [
        {
          model: Permission,
          as: 'permissions',
          through: {
            attributes: ['status'],
            as: 'subscriptionPermission'
          },
          attributes: ['id', 'name', 'display_name', 'description', 'type']
        }
      ],
      order: [['name', 'ASC']]
    });

    // Add isGlobal flag and format permissions with status
    return subscriptions.map(subscription => {
      const subscriptionJson = subscription.toJSON();
      const permissionsWithStatus = subscriptionJson.permissions.map(perm => {
        const status = perm.subscriptionPermission?.status || 'not_subscribed';
        return {
          ...perm,
          subscriptionStatus: status
        };
      });

      return {
        ...subscriptionJson,
        isGlobal: subscription.companyId === null,
        permissions: permissionsWithStatus
      };
    });
  } catch (error) {
    throw { status: 500, message: error.message };
  }
};

const getAllPermissions = async () => {
  try {
    const permissions = await Permission.findAll({
      attributes: ['id', 'name', 'display_name', 'description', 'type'],
      order: [['name', 'ASC']]
    });
    return permissions;
  } catch (error) {
    throw { status: 500, message: error.message };
  }
};

/**
 * Validates that the caller may write the given subscription's permissions and that `status` is
 * one of the accepted values. Throws the same `{ status, message }` shape used by the rest of
 * this service so the wrapping `try/catch` rethrows produce the right HTTP response.
 */
async function assertCanWriteSubscriptionStatus(subscription_id, status, userId) {
  const subscription = await findModelByIdOrThrow(Subscription, subscription_id, {}, 'Subscription');
  if (subscription.companyId === null) {
    const user = await findModelByIdOrThrow(User, userId, { attributes: ['isSupportUser'] }, 'User');
    if (!user.isSupportUser) {
      throw { status: 403, message: 'Only superadmins can modify default system subscriptions' };
    }
  }
  if (!['subscribed', 'not_subscribed', 'hidden'].includes(status)) {
    throw { status: 400, message: 'Invalid status. Must be one of: subscribed, not_subscribed, hidden' };
  }
}

/** Insert-or-update a single (subscription, permission) SubscriptionPermission row to the given status. */
async function upsertSubscriptionPermission(subscription_id, permission_id, status) {
  const [subscriptionPermission, created] = await SubscriptionPermission.findOrCreate({
    where: { subscription_id, permission_id },
    defaults: { subscription_id, permission_id, status }
  });
  if (!created) {
    subscriptionPermission.status = status;
    await subscriptionPermission.save();
  }
}

const updateSubscriptionPermissionStatus = async (subscription_id, permission_id, status, userId) => {
  try {
    await assertCanWriteSubscriptionStatus(subscription_id, status, userId);
    await findModelByIdOrThrow(Permission, permission_id, {}, 'Permission');
    await upsertSubscriptionPermission(subscription_id, permission_id, status);
    return { message: `Permission status updated to ${status} successfully` };
  } catch (error) {
    throw { status: error.status || 500, message: error.message };
  }
};

const updateMultipleSubscriptionPermissionStatuses = async (subscription_id, permission_ids, status, userId) => {
  try {
    await assertCanWriteSubscriptionStatus(subscription_id, status, userId);

    const permission_idArray = Array.isArray(permission_ids) ? permission_ids : [permission_ids];
    const permissions = await Permission.findAll({ where: { id: permission_idArray } });
    if (permissions.length !== permission_idArray.length) {
      const foundIds = permissions.map(p => p.id);
      const missingIds = permission_idArray.filter(id => !foundIds.includes(id));
      throw { status: 404, message: `Permissions with ids ${missingIds.join(', ')} not found` };
    }

    const promises = permission_idArray.map((permission_id) =>
      upsertSubscriptionPermission(subscription_id, permission_id, status)
    );

    await Promise.all(promises);

    return {
      message: `Successfully updated ${permission_idArray.length} permission(s) status to ${status}`
    };
  } catch (error) {
    throw {
      status: error.status || 500,
      message: error.message || `Error updating subscription permission statuses ${error.message}`
    };
  }
};

/**
 * Export a subscription's permissions to a portable JSON shape:
 *   { name, description, isGlobal, permissions: [{ name, status }] }
 * Only permissions with status 'subscribed' or 'hidden' are exported;
 * 'not_subscribed' is the implicit default.
 */
const exportSubscription = async (subscriptionId) => {
  const subscription = await Subscription.findByPk(subscriptionId, {
    include: [{
      model: Permission,
      as: 'permissions',
      through: { attributes: ['status'], as: 'subscriptionPermission' },
      attributes: ['id', 'name', 'display_name', 'description', 'type']
    }]
  });
  if (!subscription) {
    throw { status: 404, message: `Subscription ${subscriptionId} not found` };
  }

  const json = subscription.toJSON();
  const permissions = (json.permissions || [])
    .map(p => ({
      name: p.name,
      status: p.subscriptionPermission?.status || 'not_subscribed'
    }))
    .filter(p => EXPORT_VISIBLE_STATUSES.includes(p.status));

  return {
    name: json.name,
    description: json.description || null,
    isGlobal: subscription.companyId === null,
    permissions
  };
};

module.exports = {
  createSubscription,
  getSubscriptionsAndPermissions,
  getAllPermissions,
  updateSubscriptionPermissionStatus,
  updateMultipleSubscriptionPermissionStatuses,
  exportSubscription,
  importSubscription
};

