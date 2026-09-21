'use strict';
const env = require('../../../config/env');
const { VERIFY_REASONS } = require('../../../constants/license');
const { nowMs } = require('../../../utils/clock');
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
 * Enforcement is tied to secure cookies, and deliberately this way round: a
 * secure-cookie install is the hosted deployment we run ourselves, which needs no
 * licence, so it bypasses. Everything else — self-hosted/on-prem, served without
 * secure cookies — is what licensing exists to gate, so it is enforced.
 *
 * Consequence for local dev: with SECURE_COOKIE off the gate is live, so the
 * server boots LOCKED (`no_pinned_keys`) and every non-recovery endpoint returns
 * 503 until you supply LICENSE_WALLET_PUBLIC_KEYS (or a licence), set
 * SECURE_COOKIE=true, or set LICENSE_ENFORCEMENT_DISABLED=true — the escape
 * hatch for setups that need SECURE_COOKIE=false for unrelated cookie
 * reasons (e.g. serving plain HTTP on a non-loopback host) without wanting
 * license enforcement to follow.
 */
async function loadAndVerify() {
  if (!env.isOnPremDeployment || env.licenseEnforcementDisabled) {
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
