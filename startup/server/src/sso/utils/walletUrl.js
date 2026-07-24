'use strict';

const env = require('../../config/env');
const { WALLET_USER_MANAGEMENT_PATH } = require('../../constants/oidc');

// WALLET_SERVER_URL is an API base (`.../api/v1`), so only its origin is used.
const getWalletUserManagementUrl = () => {
  try {
    return `${new URL(env.WALLET_SERVER_URL).origin}${WALLET_USER_MANAGEMENT_PATH}`;
  } catch {
    return null;
  }
};

module.exports = { getWalletUserManagementUrl };

