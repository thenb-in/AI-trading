'use strict';

const logger = require('../../../logger');
const companyService = require('../../services/companyService');
const userService = require('../../services/userService');

const provisionUserFromSignup = async ({ claims, companyId }) => {
  const username = claims.preferred_username?.trim().toLowerCase();
  if (!username || !claims.sub) {
    throw { status: 400, message: 'Wallet account is missing a username' };
  }

  const company = await companyService.getCompanyById(companyId);
  if (!company) {
    logger.warn(`[oidc-rp] Signup for unknown company: ${companyId}`);
    throw { status: 404, message: 'Company not found' };
  }

  const existing = await userService.getUserByUsername(username);
  if (existing) {
    logger.warn(`[oidc-rp] Signup username already local: ${username}`);
    throw { status: 409, message: 'This username already exists. Ask an admin to link your account.' };
  }

  const user = await userService.createSsoUser({
    username,
    name: claims.name?.trim() || username,
    companyId,
    walletAccountId: claims.sub
  });

  logger.info(`[oidc-rp] Provisioned SSO user: ${user.id} - Company: ${companyId} - Sub: ${claims.sub}`);
  return user;
};

module.exports = {
  provisionUserFromSignup
};
