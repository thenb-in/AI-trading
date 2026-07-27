'use strict';

const env = require('../../config/env');
const { WALLET_USER_MANAGEMENT_PATH } = require('../../constants/oidc');


const getWalletUserManagementUrl = () => {
  const base = env.OIDC_ISSUER;
  try {
    return `${new URL(base).origin}${WALLET_USER_MANAGEMENT_PATH}`;
  } catch {
    return null;
  }
};

module.exports = { getWalletUserManagementUrl };

