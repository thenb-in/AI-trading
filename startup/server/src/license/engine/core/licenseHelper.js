'use strict';
const { VERIFY_REASONS } = require('../../../constants/license');
const { nowMs, toEpochMs } = require('../../../utils/dateUtils');
const licenseSeal = require('./licenseSeal');
const licenseStore = require('./licenseStore');
const machineFingerprint = require('./machineFingerprint');
const { clockSkewMs, expiryDeadlineMs, expectedAppName } = require('./licenseUtils');

// Reusable verification / persistence building blocks shared by loadAndVerify,
// renewal and airgap flows. Not part of the public service API.

/**
 * Run every rejection check for an already signature-verified payload:
 * app identity, machine fingerprint, validity window, and anti-rollback seal.
 * Read-only (the seal is validated, not advanced). Returns { ok: true } or a
 * failure object with a `reason`.
 */
async function runRejectionChecks({ payload, opts = {} }) {
  // App guard: an install only accepts tokens minted for its own app identity.
  if (payload.app_name && payload.app_name.toLowerCase() !== expectedAppName().toLowerCase()) {
    return { ok: false, reason: VERIFY_REASONS.APP_NAME_MISMATCH, expected: expectedAppName(), got: payload.app_name };
  }

  if (opts.skipMachineCheck !== true) {
    const fingerprint = machineFingerprint.verify(payload.machine_fingerprint);
    if (!fingerprint.ok) {
      return { ok: false, reason: `machine_${fingerprint.reason}`, detail: fingerprint };
    }
  }

  if (opts.skipExpiryCheck !== true) {
    const now = nowMs();
    const notBeforeMs = toEpochMs(payload.not_before);
    if (Number.isFinite(notBeforeMs) && now + clockSkewMs(payload) < notBeforeMs) {
      return { ok: false, reason: VERIFY_REASONS.NOT_YET_VALID, notBefore: payload.not_before };
    }
    if (Number.isFinite(toEpochMs(payload.expires_at)) && now > expiryDeadlineMs(payload)) {
      return { ok: false, reason: VERIFY_REASONS.EXPIRED, expiresAt: payload.expires_at };
    }
  }

  if (opts.skipSealCheck !== true) {
    const dbSeal = await licenseStore.readDbSeal().catch(() => null);
    const sealCheck = licenseSeal.validateAgainstSeal(payload, dbSeal);
    if (!sealCheck.ok) {
      return { ok: false, reason: sealCheck.reason, detail: sealCheck };
    }
  }

  return { ok: true };
}

/**
 * The single trusted WRITE path: verify a token, then persist it (file + DB)
 * and advance the seal. Used only by install / renewal / airgap. On failure,
 * nothing is persisted.
 */
async function acceptToken({ token, payload, opts = {} }) {
  const checks = await runRejectionChecks({ payload, opts });
  if (!checks.ok) {
    return checks;
  }

  await licenseStore.persist({ token, payload });
  const advance = licenseSeal.advanceSeal({
    payload,
    token,
    persistDbSeal: licenseStore.persistSealMirror
  });

  return { ok: true, token, payload, verifiedAt: nowMs(), sealAdvanced: !!advance.advanced };
}

module.exports = {
  runRejectionChecks,
  acceptToken
};
