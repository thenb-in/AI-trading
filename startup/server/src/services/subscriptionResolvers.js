const { Op } = require('sequelize');
const logger = require('../../logger');
const env = require('../config/env');
const { Permission } = require('../models');
const licenseService = require('../license/licenseService');
const { fetchCompanySubscriptionsFromWallet } = require('../../interfaces/wallet/subscriptionInterface');


const buildLicenseSubscriptions = async (companyId) => {
  const snapshot = await licenseService.getStatusSnapshot();
  if (!snapshot.ok) {
    return [];
  }
  // The installed license belongs to exactly one company. Refuse to serve its
  // plans for any other company.
  if (snapshot.customer_id !== companyId) {
    throw new Error(`License belongs to company ${snapshot.customer_id}, not ${companyId}`);
  }
  const plans = Array.isArray(snapshot.plan) ? snapshot.plan : [];

  // The token carries id/name/status/display_name per permission, but not
  // `type`/`description` — those come from the local Permission table.
  const permissionIds = [...new Set(
    plans.flatMap((plan) => (plan.permissions || []).map((perm) => perm.id)).filter(Boolean)
  )];
  const localPermissions = permissionIds.length
    ? await Permission.findAll({
      where: { id: { [Op.in]: permissionIds } },
      attributes: ['id', 'display_name', 'description', 'type']
    })
    : [];
  const localById = new Map(localPermissions.map((row) => [row.id, row.toJSON()]));

  return plans.map((plan) => ({
    id: plan.id,
    name: plan.name,
    description: plan.description ?? null,
    company_id: null,
    isGlobal: plan.isGlobal ?? true,
    permissions: (plan.permissions || []).map((perm) => {
      const local = localById.get(perm.id) || {};
      return {
        id: perm.id,
        name: perm.name,
        display_name: perm.display_name ?? local.display_name ?? null,
        description: local.description ?? null,
        type: local.type ?? null,
        subscriptionStatus: perm.status
      };
    })
  }));
};

/**
 * Validate a company's locally-computed subscriptions against the wallet.
 */
const validateSubscriptionsWithWallet = async (companyId, localSubs) => {
  if (!env.APP_KEY) {
    return localSubs;
  }

  let walletPlans;
  try {
    walletPlans = await fetchCompanySubscriptionsFromWallet(env.APP_KEY, companyId);
  } catch (error) {
    logger.warn(`Wallet validation skipped (company ${companyId}): ${error.message}`);
    return localSubs;
  }

  const localById = new Map(localSubs.map((sub) => [sub.id, sub]));

  return walletPlans
    .filter((plan) => localById.has(plan.id))
    .map((plan) => {
      const localSub = localById.get(plan.id);
      const localPermById = new Map((localSub.permissions || []).map((perm) => [perm.id, perm]));

      const permissions = (plan.permissions || [])
        .filter((walletPerm) => localPermById.has(walletPerm.id))
        .map((walletPerm) => {
          const localPerm = localPermById.get(walletPerm.id);
          return {
            id: walletPerm.id,
            name: walletPerm.name,
            display_name: walletPerm.display_name,
            description: localPerm.description ?? null,
            type: localPerm.type ?? null,
            subscriptionStatus: localPerm.subscriptionStatus
          };
        });

      return {
        ...localSub,
        permissions
      };
    });
};

module.exports = {
  buildLicenseSubscriptions,
  validateSubscriptionsWithWallet
};
