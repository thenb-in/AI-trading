'use strict';
const logger = require('../../../../logger');
const companyService = require('../../../services/companyService');
const permissionService = require('../../../services/permissionService');
const { importSubscription } = require('../../../services/subscription/import');
const { getSubscriptionByName } = require('../../../services/subscription/getSubscription.service');
const { SUBSCRIPTION_STATUS } = require('../../../constants/subscription');


async function subscribeCompanyToPlan(company, plan) {
  const existing = await getSubscriptionByName(plan.name, company.id);
  const { subscription } = await importSubscription({
    id: existing?.id,
    name: plan.name,
    description: plan.description ?? null,
    isGlobal: false,
    permissions: (plan.permissions || []).map((permission) => ({
      name: permission.name,
      status: permission.status || SUBSCRIPTION_STATUS.SUBSCRIBED
    }))
  }, company.id);
  const { addCompanySubscription } = require('../../../services/companySubscription.service');
  await addCompanySubscription(company.id, subscription.id);
  logger.info(`[license] Company ${company.name} subscribed to plan "${plan.name}"`);
}


async function provisionFromLicense(payload) {
  if (!payload?.customer_id) {
    logger.warn(`[license] Token carries no customer_id — nothing to provision , ${payload?.customer_id}`);
    return;
  }
  const plans = (Array.isArray(payload.plan) ? payload.plan : []).filter((plan) => plan?.name);
  try {
    const company = await companyService.findOrCreateCompany({
      id: payload.customer_id,
      name: 'default'
    });
    await permissionService.createMissingPermissions(plans.flatMap((plan) => plan.permissions || []));
    for (const plan of plans) {
      await subscribeCompanyToPlan(company, plan);
    }
    logger.info(`[license] Provisioned company ${company.id} with ${plans.length} plan(s) from license ${payload.license_id}`);
  } catch (err) {
    logger.error(`[license] Provisioning from license ${payload.license_id} failed, token stays installed: ${err.message}`, err);
  }
}

module.exports = { provisionFromLicense };
