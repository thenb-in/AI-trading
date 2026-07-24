'use strict';
const crypto = require('crypto');
const { LICENSE_ERRORS } = require('../../../constants/license');
const { nowIso } = require('../../../utils/dateUtils');
const machineFingerprint = require('../core/machineFingerprint');
const pinnedKeys = require('../core/pinnedKeys');
const tokenFormat = require('../core/tokenFormat');
const { loadAndVerify } = require('./verify');
const { acceptToken } = require('../core/licenseHelper');
const { expectedAppName } = require('../core/licenseUtils');

/**
 * Build a renewal request bundle the operator can carry to the wallet. Returns
 * plain JSON; the route layer sends it to the client as a file download.
 */
async function buildAirgapRequest() {
  const state = await loadAndVerify();
  if (!state.ok || !state.token) {
    throw new Error(LICENSE_ERRORS.NO_CURRENT_LICENSE);
  }
  const fingerprint = machineFingerprint.compute();
  return {
    kind: 'airgap-request',
    app_name: expectedAppName(),
    current_token: state.token,
    machine_fingerprint: fingerprint.fingerprint,
    requested_at: nowIso(),
    nonce: crypto.randomBytes(16).toString('hex')
  };
}

/** Apply a wallet-issued renewal response token (operator-uploaded). */
async function applyAirgapResponse({ token }) {
  if (typeof token !== 'string' || !token) {
    throw new Error(LICENSE_ERRORS.TOKEN_REQUIRED);
  }
  const verified = tokenFormat.verifyToken(token, pinnedKeys.load());
  if (!verified.ok) {
    throw new Error(`${LICENSE_ERRORS.AIRGAP_VERIFY_FAILED}: ${verified.reason}`);
  }
  const accepted = await acceptToken({ token, payload: verified.payload });
  if (!accepted.ok) {
    const err = new Error(`${LICENSE_ERRORS.AIRGAP_REJECTED}: ${accepted.reason}`);
    err.detail = accepted;
    throw err;
  }
  return accepted;
}

/**
 * Install a brand-new license (operator-delivered token after fresh machine
 * provisioning). Same acceptance path as applyAirgapResponse; kept separate
 * for audit/log clarity.
 */
async function installToken({ token }) {
  return applyAirgapResponse({ token });
}

module.exports = {
  buildAirgapRequest,
  applyAirgapResponse,
  installToken
};
