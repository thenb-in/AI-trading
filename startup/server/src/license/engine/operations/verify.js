'use strict';
const env = require('../../../config/env');
const { VERIFY_REASONS } = require('../../../constants/license');
const { nowMs } = require('../../../utils/dateUtils');
const pinnedKeys = require('../core/pinnedKeys');
const licenseStore = require('../core/licenseStore');
const { runRejectionChecks } = require('../core/licenseHelper');

/**
 * Load the active token fresh from the store and verify it. READ-only — never
 * persists and caches nothing. Returns a state object:
 *   { ok: true, token, payload, verifiedAt }              (valid)
 *   { ok: true, bypass: true, reason, verifiedAt }        (enforcement off)
 *   { ok: false, reason, verifiedAt, ... }                (missing / invalid)
 *
 * Enforcement is tied to secure cookies: when `isSecureCookie` is false we treat
 * the install as local/dev and bypass the gate; secure cookies (production)
 * enforce it.
 */
async function loadAndVerify() {
  if (env.isSecureCookie) {
    return { ok: true, bypass: true, reason: VERIFY_REASONS.ENFORCEMENT_DISABLED, verifiedAt: nowMs() };
  }

  if (!pinnedKeys.isConfigured()) {
    return { ok: false, reason: VERIFY_REASONS.NO_PINNED_KEYS, verifiedAt: nowMs() };
  }

  const loaded = await licenseStore.loadVerifiedToken();
  if (!loaded) {
    return { ok: false, reason: VERIFY_REASONS.NO_LICENSE, verifiedAt: nowMs() };
  }

  const checks = await runRejectionChecks({ payload: loaded.payload });
  if (!checks.ok) {
    return { ...checks, verifiedAt: nowMs() };
  }

  return { ok: true, token: loaded.token, payload: loaded.payload, verifiedAt: nowMs() };
}

/** The current verified license state (loaded fresh). */
async function getCurrentState() {
  return loadAndVerify();
}

module.exports = {
  loadAndVerify,
  getCurrentState
};
