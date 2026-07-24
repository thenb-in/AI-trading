'use strict';

const logger = require('../../../logger');
const companyService = require('../../services/companyService');
const userService = require('../../services/userService');


const resolveCompany = async (claims) => {
  const walletCompany = claims.user?.company || null;
  const companyId = walletCompany?.id || claims.customer_id;
  if (!companyId) {
    throw { status: 400, message: 'Wallet did not say which organization this user belongs to' };
  }

  const existing = await companyService.getCompanyById(companyId);
  if (existing) {
    return existing;
  }

  const company = await companyService.createCompany({
    id: companyId,
    name: walletCompany?.name || companyId
  });
  logger.info(`[oidc-rp] Created company from Wallet: ${company.id} - ${company.name}`);
  return company;
};


const provisionUser = async (claims, company) => {
  const username = claims.preferred_username?.trim();
  if (!username) {
    throw { status: 400, message: 'Wallet account is missing a username' };
  }

  const user = await userService.createSsoUser({
    username,
    name: claims.name?.trim() || username,
    phone: claims.phone_number?.trim() || null,
    companyId: company.id,
    walletUserId: claims.sub
  });

  logger.info(`[oidc-rp] Provisioned SSO user: ${user.id} - Company: ${company.id} - Sub: ${claims.sub}`);
  return user;
};

module.exports = {
  resolveCompany,
  provisionUser
};
