const { Op } = require('sequelize');
const logger = require('../../logger');
const { CompanySubscription, Subscription, Company, Permission } = require('../models');


/**
 * Get all subscriptions for a company with permissions
 */
const getCompanySubscriptions = async (companyId) => {
  if (!companyId) {
    throw new Error(`Company id is required found: ${companyId}`);
  }

  const companySubscriptions = await CompanySubscription.findAll({
    where: { company_id: companyId },
    include: [
      {
        model: Subscription,
        as: 'subscription',
        attributes: ['id', 'name', 'description', 'company_id'],
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
        ]
      }
    ],
    order: [['created_at', 'DESC']]
  });

  // Format subscriptions with permissions and status
  return companySubscriptions.map(cs => {
    const subscription = cs.subscription.toJSON();
    const isGlobal = subscription.company_id === null;
    const permissionsWithStatus = subscription.permissions.map(perm => {
      const status = perm.subscriptionPermission?.status || 'not_subscribed';
      return {
        ...perm,
        subscriptionStatus: status
      };
    });

    return {
      ...subscription,
      isGlobal,
      permissions: permissionsWithStatus
    };
  });
};

/**
 * Get all available subscriptions (global + company-specific)
 */
const getAvailableSubscriptions = async (companyId) => {
  const whereClause = {
    [Op.or]: [
      { company_id: null }, // Global subscriptions
      { company_id: companyId } // Company-specific subscriptions
    ]
  };

  const subscriptions = await Subscription.findAll({
    where: whereClause,
    attributes: ['id', 'name', 'description', 'company_id'],
    order: [['name', 'ASC']]
  });

  return subscriptions;
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

module.exports = {
  getCompanySubscriptions,
  getAvailableSubscriptions,
  setCompanySubscriptions,
  addCompanySubscription
};

