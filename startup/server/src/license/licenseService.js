'use strict';

// Verifier-side license business logic, used by middleware, routes,
// scheduler, and CLI scripts.
//
// Public surface:
//   - loadAndVerify()          → ensure the in-process license is valid;
//                                returns a verified-state object or a
//                                fatal failure reason.
//   - getCurrentState()        → returns the cached verified state, or
//                                triggers a load on first call.
//   - hasLicensedPermission()  → permission gate used by requirePermission.
//   - renewOnline()            → fetch a new token from the wallet, verify
//                                + persist it, advance the seal.
//   - buildAirgapRequest()     → write a request file to disk for an
//                                operator to ferry to the wallet.
//   - applyAirgapResponse()    → accept a wallet-issued token, verify,
//                                persist, advance the seal.
//
// All paths funnel through `acceptToken()` which is the single trusted
// path for "this token becomes the new active license". Anything that
// flows around acceptToken bypasses the seal — don't do it.

const crypto = require('crypto');
const axios = require('axios');
const env = require('../config/env');
const {
  DEFAULT_CLOCK_SKEW_SECONDS,
  LICENSE_ERRORS,
  VERIFY_REASONS,
  WALLET_RENEW_TIMEOUT_MS
} = require('../constants/license');
const licenseSeal = require('./licenseSeal');
const licenseStore = require('./licenseStore');
const machineFingerprint = require('./machineFingerprint');
const pinnedKeys = require('./pinnedKeys');
const tokenFormat = require('./tokenFormat');

// In-memory cache. Re-validated on every request via the middleware's
// shallow expiry check; renewed via scheduler. Set by `acceptToken()`.
let currentState = null;

function licenseEnforcementEnabled() {
  // Fail-secure: enforcement is ON unless EXPLICITLY disabled. A missing,
  // empty, or unrecognized value (including typos like "ture") keeps the
  // gate enabled, so a misconfiguration can never silently unlock a
  // production install. Only an explicit off-switch turns it off — set
  // LICENSE_ENFORCEMENT=false in dev/CI to bypass.
  // env.js centralises the default (process.env.LICENSE_ENFORCEMENT || 'true'),
  // so a missing/blank flag already arrives here as 'true'. We must NOT apply a
  // default again here (custom/no-env-outside-env-js).
  const raw = String(env.LICENSE_ENFORCEMENT).trim().toLowerCase();
  const DISABLED = new Set(['false', '0', 'off', 'no']);
  return !DISABLED.has(raw);
}

function getAppName() {
  return env.APP_NAME;
}

function nowMs() {
  return Date.now();
}

/**
 * Internal: given a freshly-verified payload + token, run all rejection
 * checks (machine, expiry, seal) and update in-memory + persistent state.
 *
 * On success: state cache is set, file + DB persisted, seal advanced.
 * On failure: state cache stays whatever it was, NOTHING is persisted.
 * Returns a result object the caller can render or surface.
 */
async function acceptToken({ token, payload, opts = {} }) {
  const skipMachineCheck = opts.skipMachineCheck === true;
  const skipExpiryCheck = opts.skipExpiryCheck === true;
  const skipSealCheck = opts.skipSealCheck === true;

  // App name guard. Each app installs only the licenses minted for its
  // app_name. A token issued for "etime-payroll" can't be moved to a
  // "nbnext-startup" install. Comparison is case-insensitive because
  // package.json names and env values drift.
  if (payload.app_name && payload.app_name.toLowerCase() !== getAppName().toLowerCase()) {
    return { ok: false, reason: VERIFY_REASONS.APP_NAME_MISMATCH, expected: getAppName(), got: payload.app_name };
  }

  if (!skipMachineCheck) {
    const fp = machineFingerprint.verify(payload.machine_fingerprint);
    if (!fp.ok) {
      return { ok: false, reason: `machine_${fp.reason}`, detail: fp };
    }
  }

  if (!skipExpiryCheck) {
    const now = nowMs();
    const nbMs = new Date(payload.not_before).getTime();
    const expMs = new Date(payload.expires_at).getTime();
    const skewMs = (payload.max_clock_skew_seconds || DEFAULT_CLOCK_SKEW_SECONDS) * 1000;
    if (Number.isFinite(nbMs) && now + skewMs < nbMs) {
      return { ok: false, reason: VERIFY_REASONS.NOT_YET_VALID, notBefore: payload.not_before };
    }
    if (Number.isFinite(expMs) && now > expMs + skewMs) {
      return { ok: false, reason: VERIFY_REASONS.EXPIRED, expiresAt: payload.expires_at };
    }
  }

  if (!skipSealCheck) {
    const dbSeal = await licenseStore.readDbSeal().catch(() => null);
    const sealCheck = licenseSeal.validateAgainstSeal(payload, dbSeal);
    if (!sealCheck.ok) {
      return { ok: false, reason: sealCheck.reason, detail: sealCheck };
    }
  }

  // All checks passed — promote to active state.
  await licenseStore.persist({ token, payload });
  const advance = licenseSeal.advanceSeal({
    payload,
    token,
    persistDbSeal: licenseStore.persistSealMirror
  });

  currentState = {
    ok: true,
    token,
    payload,
    verifiedAt: nowMs(),
    sealAdvanced: !!advance.advanced
  };
  return currentState;
}

/**
 * Boot-time + per-request entry point. Loads the token from file/DB,
 * verifies signature with pinned keys, then runs full acceptance checks.
 * Caches the result in `currentState` for cheap subsequent calls.
 *
 * `force=true` forces a full reload (used by the scheduler and after
 * renewals).
 */
async function loadAndVerify({ force = false } = {}) {
  if (!licenseEnforcementEnabled()) {
    currentState = {
      ok: true,
      bypass: true,
      reason: VERIFY_REASONS.ENFORCEMENT_DISABLED,
      verifiedAt: nowMs()
    };
    return currentState;
  }

  if (!force && currentState && currentState.ok && currentState.payload) {
    // Cheap re-check: only the expiry deadline can change between calls
    // without a renewal.
    const expMs = new Date(currentState.payload.expires_at).getTime();
    const skewMs = (currentState.payload.max_clock_skew_seconds || DEFAULT_CLOCK_SKEW_SECONDS) * 1000;
    if (Number.isFinite(expMs) && nowMs() <= expMs + skewMs) {
      return currentState;
    }
    // Otherwise fall through and revalidate (token may have been renewed
    // on disk by the scheduler or operator since last check).
  }

  if (!pinnedKeys.isConfigured()) {
    currentState = { ok: false, reason: VERIFY_REASONS.NO_PINNED_KEYS, verifiedAt: nowMs() };
    return currentState;
  }

  const loaded = await licenseStore.loadVerifiedToken();
  if (!loaded) {
    currentState = { ok: false, reason: VERIFY_REASONS.NO_LICENSE, verifiedAt: nowMs() };
    return currentState;
  }
  return acceptToken({ token: loaded.token, payload: loaded.payload });
}

function getCurrentState() {
  return currentState;
}

/**
 * Permission gate. Returns true ONLY if the license whitelist allows the
 * permission. ["*"] means "any". Empty list means "none". When licensing
 * is bypassed (dev mode), returns true.
 */
function hasLicensedPermission(permissionName) {
  if (!currentState) {
    return false;
  }
  if (currentState.bypass) {
    return true;
  }
  if (!currentState.ok) {
    return false;
  }
  const allowed = currentState.payload?.permissions || [];
  if (allowed.includes('*')) {
    return true;
  }
  return allowed.includes(permissionName);
}

/** Returns the array of license-whitelisted permission names, or null if licensing is bypassed (everything allowed). */
function getLicensedPermissions() {
  if (!currentState) {
    return [];
  }
  if (currentState.bypass) {
    return null;
  }
  return currentState.payload?.permissions || [];
}

// ─── Online renewal ────────────────────────────────────────────────────────

function walletRenewUrl() {
  const base = env.WALLET_SERVER_URL;
  if (!base) {
    throw new Error(LICENSE_ERRORS.WALLET_URL_NOT_CONFIGURED);
  }
  return `${base.replace(/\/+$/, '')}/license/renew`;
}

async function renewOnline() {
  if (!currentState || !currentState.ok || !currentState.token) {
    throw new Error(LICENSE_ERRORS.NO_CURRENT_LICENSE);
  }
  const fp = machineFingerprint.compute();
  const body = {
    currentToken: currentState.token,
    machineFingerprint: fp.fingerprint
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

  const v = tokenFormat.verifyToken(newToken, pinnedKeys.load());
  if (!v.ok) {
    throw new Error(`${LICENSE_ERRORS.RENEW_VERIFY_FAILED}: ${v.reason}`);
  }

  const accept = await acceptToken({ token: newToken, payload: v.payload });
  if (!accept.ok) {
    throw new Error(`${LICENSE_ERRORS.RENEW_REJECTED}: ${accept.reason}`);
  }
  return accept;
}

// ─── Airgap workflow ──────────────────────────────────────────────────────

/**
 * Build a renewal request bundle the operator can carry to the wallet.
 * Returns the bundle plain JSON — the route layer is responsible for
 * sending it back to the client as a file download.
 */
function buildAirgapRequest() {
  if (!currentState || !currentState.ok || !currentState.token) {
    throw new Error(LICENSE_ERRORS.NO_CURRENT_LICENSE);
  }
  const fp = machineFingerprint.compute();
  return {
    kind: 'airgap-request',
    app_name: getAppName(),
    current_token: currentState.token,
    machine_fingerprint: fp.fingerprint,
    requested_at: new Date().toISOString(),
    nonce: crypto.randomBytes(16).toString('hex')
  };
}

/**
 * Apply a wallet-issued renewal response token. Operator-uploaded.
 */
async function applyAirgapResponse({ token }) {
  if (typeof token !== 'string' || !token) {
    throw new Error(LICENSE_ERRORS.TOKEN_REQUIRED);
  }
  const v = tokenFormat.verifyToken(token, pinnedKeys.load());
  if (!v.ok) {
    throw new Error(`${LICENSE_ERRORS.AIRGAP_VERIFY_FAILED}: ${v.reason}`);
  }
  const accept = await acceptToken({ token, payload: v.payload });
  if (!accept.ok) {
    const err = new Error(`${LICENSE_ERRORS.AIRGAP_REJECTED}: ${accept.reason}`);
    err.detail = accept;
    throw err;
  }
  return accept;
}

// ─── Install (first boot) ─────────────────────────────────────────────────

/**
 * Install a brand-new license (operator delivered token after fresh
 * machine provisioning). Same as applyAirgapResponse but distinguished
 * for audit/log purposes.
 */
async function installToken({ token }) {
  return applyAirgapResponse({ token });
}

// ─── Status snapshot ──────────────────────────────────────────────────────

function getStatusSnapshot() {
  if (!currentState) {
    return { ok: false, reason: VERIFY_REASONS.NOT_LOADED };
  }
  if (currentState.bypass) {
    return { ok: true, bypass: true, reason: currentState.reason };
  }
  if (!currentState.ok) {
    return { ok: false, reason: currentState.reason, detail: currentState };
  }
  const p = currentState.payload;
  return {
    ok: true,
    license_id: p.license_id,
    customer_id: p.customer_id,
    app_name: p.app_name,
    serial: p.serial,
    subscription_id: p.subscription_id ?? null,
    permissions: p.permissions ?? [],
    permission_caps: p.permission_caps ?? {},
    issued_at: p.issued_at,
    not_before: p.not_before,
    expires_at: p.expires_at,
    renewal_after: p.renewal_after,
    renewal_mode: p.renewal_mode || 'online',
    days_until_expiry: Math.max(0, Math.ceil(
      (new Date(p.expires_at).getTime() - nowMs()) / 86400000
    )),
    machine_fingerprint: p.machine_fingerprint,
    last_verified_at: new Date(currentState.verifiedAt).toISOString()
  };
}

/** Test/CLI helper — let scripts reset cache so they can do a clean run. */
function _resetForTest() {
  currentState = null;
  pinnedKeys._reset();
}

module.exports = {
  licenseEnforcementEnabled,
  loadAndVerify,
  getCurrentState,
  getStatusSnapshot,
  hasLicensedPermission,
  getLicensedPermissions,
  renewOnline,
  buildAirgapRequest,
  applyAirgapResponse,
  installToken,
  _resetForTest
};
