'use strict';

const logger = require('../../../logger');
const companyService = require('../../services/companyService');
const { isValidUuid } = require('../../utils/uuidUtils');


async function resolveSignupCompany(action, rawCompanyId) {
  if (action !== 'signup') {
    return null;
  }

  const companyId = String(rawCompanyId || '').trim();
  const company = isValidUuid(companyId)
    ? await companyService.getCompanyById(companyId)
    : null;

  if (!company) {
    logger.warn(`[oidc-rp] Signup start for unusable company id: ${companyId}`);
    throw { status: 404, message: `Company not found. Check the ID or ask your administrator. companyid:${companyId}` };
  }
  return company;
}

module.exports = {
  resolveSignupCompany
};
