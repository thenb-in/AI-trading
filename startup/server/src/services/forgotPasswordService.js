'use strict';

const logger = require('../../logger');
const { FORGOT_PASSWORD_METHOD } = require('../constants/auth');
const sso = require('../sso');
const { findUserWithRole } = require('./authService');

const identifyForgotPasswordMethod = async (username) => {
  const user = await findUserWithRole(username);
  if (!user) {
    logger.warn(`Forgot password: user not found: ${username}`);
    throw { status: 404, message: 'User not found' };
  }

  const identityLink = await sso.findIdentityLinkByUserId(user.id);
  if (identityLink) {
    logger.info(`Forgot password: wallet-linked user, deferring to IdP: ${user.id}`);
    return {
      method: FORGOT_PASSWORD_METHOD.WALLET_SSO,
      ssoConfigured: sso.isSsoConfigured()
    };
  }

  const method = user.is_totp_enabled
    ? FORGOT_PASSWORD_METHOD.LOCAL_TOTP
    : FORGOT_PASSWORD_METHOD.LOCAL_PASSWORD;
  logger.info(`Forgot password: local user: ${user.id} - Method: ${method}`);
  return { method };
};

module.exports = {
  identifyForgotPasswordMethod
};
