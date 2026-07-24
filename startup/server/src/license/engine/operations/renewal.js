'use strict';
const axios = require('axios');
const env = require('../../../config/env');
const { LICENSE_ERRORS, WALLET_RENEW_TIMEOUT_MS } = require('../../../constants/license');
const machineFingerprint = require('../core/machineFingerprint');
const pinnedKeys = require('../core/pinnedKeys');
const tokenFormat = require('../core/tokenFormat');
const { loadAndVerify } = require('./verify');
const { acceptToken } = require('../core/licenseHelper');

function walletRenewUrl() {
  const base = env.WALLET_SERVER_URL;
  if (!base) {
    throw new Error(LICENSE_ERRORS.WALLET_URL_NOT_CONFIGURED);
  }
  return `${base.replace(/\/+$/, '')}/license/renew`;
}

async function renewOnline() {
  const state = await loadAndVerify();
  if (!state.ok || !state.token) {
    throw new Error(LICENSE_ERRORS.NO_CURRENT_LICENSE);
  }
  const fingerprint = machineFingerprint.compute();
  const body = {
    currentToken: state.token,
    machineFingerprint: fingerprint.fingerprint
  };

  let response;
  try {
    response = await axios.post(walletRenewUrl(), body, { timeout: WALLET_RENEW_TIMEOUT_MS });
  } catch (err) {
    const detail = err.response?.data?.error || err.message;
    throw new Error(`${LICENSE_ERRORS.WALLET_RENEW_FAILED}: ${detail}`);
  }

  const newToken = response.data?.token;
  if (!newToken) {
    throw new Error(LICENSE_ERRORS.WALLET_RENEW_NO_TOKEN);
  }

  const verified = tokenFormat.verifyToken(newToken, pinnedKeys.load());
  if (!verified.ok) {
    throw new Error(`${LICENSE_ERRORS.RENEW_VERIFY_FAILED}: ${verified.reason}`);
  }

  const accepted = await acceptToken({ token: newToken, payload: verified.payload });
  if (!accepted.ok) {
    throw new Error(`${LICENSE_ERRORS.RENEW_REJECTED}: ${accepted.reason}`);
  }
  return accepted;
}

module.exports = {
  walletRenewUrl,
  renewOnline
};
