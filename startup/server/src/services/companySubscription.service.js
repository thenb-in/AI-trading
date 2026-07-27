const { Op } = require('sequelize');
const logger = require('../../logger');
const { CompanySubscription, Subscription, Company, Permission } = require('../models');
const env = require('../config/env');
const { fetchAvailableSubscriptionsFromWallet, syncCompanySubscriptionsToWallet } = require('../../interfaces/wallet/subscriptionInterface');
const { buildLicenseSubscriptions, validateSubscriptionsWithWallet } = require('./subscriptionResolvers');
const { formatSubscriptionRow } = require('../data_formatters/subscriptionFormatter');
const { getSubscriptionsAndPermissions } = require('./subscription/listSubscription.service');


const COMPANY_SUBSCRIPTION_INCLUDE = [
  {
    model: Subscription,
    as: 'subscription',
    attributes: ['id', 'name', 'description', 'company_id'],
    include: [
      {
        model: Permission,
        as: 'permissions',
        attributes: ['id', 'name', 'display_name', 'description', 'type'],
        through: { as: 'subscriptionPermission', attributes: ['status'] }
      }
    ]
  }
];


// Load a company's subscriptions from the local DB (single query, no N+1).
const loadDbSubscriptions = async (companyId) => {
  const rows = await CompanySubscription.findAll({
    where: { company_id: companyId },
    include: COMPANY_SUBSCRIPTION_INCLUDE,
    order: [['created_at', 'DESC']]
  });
  return rows.map(formatSubscriptionRow);
};

/**
 * Get a company's subscriptions from the active source of truth:
 *   - offline (SECURE_COOKIE off): the installed license's plans
 *   - cloud   (SECURE_COOKIE on):  DB-backed subscriptions, validated against the wallet
 */
const getCompanySubscriptions = async (companyId) => {
  if (!companyId) {
    throw new Error(`Company id is required, got: ${companyId}`);
  }

  if (!env.SECURE_COOKIE) {
    return buildLicenseSubscriptions(companyId);
  }

  const dbSubscriptions = await loadDbSubscriptions(companyId);
  return validateSubscriptionsWithWallet(companyId, dbSubscriptions);
};

/**
 * Get all available subscriptions (global + company-specific) from the wallet —
 * includes both approved and pending entries.
 */
const getAvailableSubscriptions = async (companyId) => {
  if (!env.APP_KEY) {
    return getSubscriptionsAndPermissions(companyId);
  }
  return fetchAvailableSubscriptionsFromWallet(env.APP_KEY, companyId);
};

/**
 * Set subscriptions for a company (replace existing)
 */
const setCompanySubscriptions = async (companyId, subscriptionIds, userId) => {
  if (!companyId) {
    throw new Error(`Company ID is required ,found: ${companyId}`);
  }

  if (!Array.isArray(subscriptionIds)) {
    throw new Error(`Subscription IDs must be an array get ${typeof subscriptionIds}`);
  }

  // Verify company exists
  const company = await Company.findByPk(companyId);
  if (!company) {
    throw new Error(`Company not found with id ${companyId}`);
  }

  // Verify all subscriptions exist
  if (subscriptionIds.length > 0) {
    const subscriptions = await Subscription.findAll({
      where: {
        id: { [Op.in]: subscriptionIds }
      }
    });

    if (subscriptions.length !== subscriptionIds.length) {
      throw new Error(`One or more subscriptions not found , subscriptions:${subscriptions.length}`);
    }
  }

  // Remove existing subscriptions
  await CompanySubscription.destroy({
    where: { company_id: companyId }
  });

  // Add new subscriptions
  if (subscriptionIds.length > 0) {
    const companySubscriptions = subscriptionIds.map(subscriptionId => ({
      company_id: companyId,
      subscription_id: subscriptionId
    }));

    await CompanySubscription.bulkCreate(companySubscriptions);
  }
  // Sync the company's full set to the wallet (adds new + removes dropped). Runs even when the
  // set is empty so clearing all subscriptions here also clears them on the wallet.
  if (env.SECURE_COOKIE) {
    try {
      await syncCompanySubscriptionsToWallet({ companyId, companyName: company.name, planIds: subscriptionIds });
    } catch (err) {
      const message = err.response?.data?.message || err.message;
      logger.error(`Wallet company-subscription sync failed (company ${companyId}): ${message}`,err);
      throw new Error(message);
    }
  }

  logger.info(`User ${userId} updated subscriptions for company ${companyId}. Subscriptions: ${subscriptionIds.join(', ')}`);

  return {
    companyId,
    subscriptionIds,
    count: subscriptionIds.length
  };
};


const addCompanySubscription = async (companyId, subscriptionId, transaction) => {
  return CompanySubscription.create(
    { company_id: companyId, subscription_id: subscriptionId },
    { transaction }
  );
};

/**
 * Is `permissionName` actually subscribed for this company?
 */
const hasSubscribedPermission = async (companyId, permissionName) => {
  if (!companyId || !permissionName) {
    return false;
  }
  const subscriptions = await getCompanySubscriptions(companyId);
  return subscriptions.some((subscription) =>
    (subscription.permissions || []).some(
      (permission) => permission.name === permissionName && permission.subscriptionStatus === 'subscribed'
    )
  );
};

module.exports = {
  getCompanySubscriptions,
  hasSubscribedPermission,
  getAvailableSubscriptions,
  setCompanySubscriptions,
  addCompanySubscription
};

