'use strict';

// Local anti-rollback seal.
//
// A signed token, on its own, cannot detect "I have a perfectly valid
// older token than the one I just verified". So we maintain a sealed
// counter (highest serial ever observed) plus a high-watermark wall-clock
// timestamp, persisted to disk AND DB. On every load we:
//
//   1. Reject any token with payload.serial < seal.highest_serial.
//      (Defeats: operator replays an older valid token after a renewal.)
//
//   2. Reject if Date.now() < seal.last_wallclock - max_clock_skew.
//      (Defeats: operator rolls back the OS clock to make a long-expired
//       token's not_before/expires_at fall inside "today".)
//
//   3. After acceptance, advance the seal: highest_serial = payload.serial,
//      last_wallclock = max(now, last_wallclock).
//
// Tampering vectors and our defense:
//   - "Delete the seal file": we fall back to the DB-stored copy. Deleting
//     both file AND nuking the DB row would let an attacker reset the
//     counter — but they'd also lose the license row, so the next boot
//     fails the existence check anyway.
//   - "Edit the seal file to lower the counter": the seal is itself signed
//     by the wallet (we ask the wallet to embed `serial` AND `issued_at`
//     into the license payload; the seal then stores the LAST payload we
//     accepted, NOT a raw integer the local DB could rewrite). The
//     verifier re-derives highest_serial = max(serial across all sealed
//     payloads), so editing the file gets the attacker nothing — the
//     payloads are signed-immutable.
//
// File layout: `<SECRET_DIR>/license.seal.json`
//   {
//     "license_id": "...",
//     "machine_fingerprint": "...",
//     "highest_serial": 12,
//     "last_wallclock_iso": "2026-05-15T10:00:00Z",
//     "anchor_token": "<the most recently accepted license token>",
//   }
//
// `anchor_token` is the full signed token. It can be re-verified at any
// time to confirm `highest_serial` wasn't tampered with — if you tamper
// with the JSON to lower the integer but leave the anchor_token alone,
// the next boot recomputes highest_serial from the anchor and ignores
// your tampering.

const fs = require('fs');
const path = require('path');
const logger = require('../../logger');
const env = require('../config/env');
const pinnedKeys = require('./pinnedKeys');
const tokenFormat = require('./tokenFormat');

const SEAL_FILENAME = 'license.seal.json';

function getSealFilePath() {
  return path.join(env.SECRET_DIR, SEAL_FILENAME);
}

function ensureSecretDir() {
  fs.mkdirSync(env.SECRET_DIR, { recursive: true });
  try { fs.chmodSync(env.SECRET_DIR, 0o700); } catch { /* noop on win */ }
}

function readSealFile() {
  const file = getSealFilePath();
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    logger.error(`[license] seal file corrupt: ${err.message}`);
    return null;
  }
}

function writeSealFile(seal) {
  ensureSecretDir();
  const file = getSealFilePath();
  const tmp = `${file}.tmp.${process.pid}.${Date.now()}`;
  fs.writeFileSync(tmp, JSON.stringify(seal, null, 2) + '\n', { mode: 0o600 });
  fs.renameSync(tmp, file);
  try { fs.chmodSync(file, 0o600); } catch { /* noop */ }
}

/**
 * Re-derive the trustworthy highest_serial by verifying the anchor_token
 * against pinned keys. If the anchor_token is missing or invalid, we
 * treat highest_serial as 0 (no anchor = no defended state, fresh boot).
 */
function deriveTrustedSerial(seal) {
  if (!seal || !seal.anchor_token) return { serial: 0, payload: null };
  const keys = pinnedKeys.load();
  if (keys.length === 0) return { serial: 0, payload: null };
  const v = tokenFormat.verifyToken(seal.anchor_token, keys);
  if (!v.ok) {
    logger.warn(`[license] seal anchor_token failed verify: ${v.reason}`);
    return { serial: 0, payload: null };
  }
  return { serial: v.payload.serial || 0, payload: v.payload };
}

/**
 * Validate a candidate license payload against the local seal (file +
 * optional DB row). Returns `{ ok: true, advanced }` on success, or
 * `{ ok: false, reason }` on rollback/clock-tampering detection.
 *
 * @param {object} payload - The verified license token's payload.
 * @param {object} [dbSeal] - Optional fallback seal pulled from DB
 *   (license_seal table). Used if the on-disk seal is missing.
 */
function validateAgainstSeal(payload, dbSeal = null) {
  const fileSeal = readSealFile();
  const sealToTrust = fileSeal || dbSeal;
  const { serial: trustedSerial } = deriveTrustedSerial(sealToTrust);

  if (payload.serial < trustedSerial) {
    return {
      ok: false,
      reason: 'serial_rollback',
      trustedSerial,
      tokenSerial: payload.serial,
    };
  }

  if (sealToTrust && sealToTrust.last_wallclock_iso) {
    const lastWallMs = new Date(sealToTrust.last_wallclock_iso).getTime();
    const skewMs = (payload.max_clock_skew_seconds || 300) * 1000;
    if (Number.isFinite(lastWallMs) && Date.now() < lastWallMs - skewMs) {
      return {
        ok: false,
        reason: 'clock_rollback',
        sealedClock: sealToTrust.last_wallclock_iso,
        now: new Date().toISOString(),
      };
    }
  }

  return { ok: true, trustedSerial };
}

/**
 * Advance the seal after a token is accepted. Writes both file and
 * (caller's responsibility) the DB row if a `persistDbSeal` callback is
 * supplied.
 */
function advanceSeal({ payload, token, persistDbSeal = null }) {
  const fileSeal = readSealFile();
  const { serial: trustedSerial } = deriveTrustedSerial(fileSeal);
  // Only advance if the new serial is strictly greater. Equal serials are
  // boot-time re-verification of the existing token — no advance needed.
  if (payload.serial <= trustedSerial && fileSeal && fileSeal.anchor_token === token) {
    return { advanced: false };
  }

  const lastWallMs = fileSeal?.last_wallclock_iso
    ? new Date(fileSeal.last_wallclock_iso).getTime() : 0;
  const newWall = new Date(Math.max(Date.now(), lastWallMs)).toISOString();

  const newSeal = {
    license_id: payload.license_id,
    machine_fingerprint: payload.machine_fingerprint,
    highest_serial: payload.serial,
    last_wallclock_iso: newWall,
    anchor_token: token,
  };

  writeSealFile(newSeal);
  if (typeof persistDbSeal === 'function') {
    // Best-effort; DB persistence failures must NOT block license
    // acceptance — the file seal is the authoritative defense.
    Promise.resolve(persistDbSeal(newSeal)).catch(err => {
      logger.warn(`[license] DB seal persist failed: ${err.message}`);
    });
  }
  return { advanced: true, seal: newSeal };
}

/**
 * Periodic "I'm still running" wall-clock bump. Called by the scheduler
 * so the seal's last_wallclock_iso tracks reality. Without this, a
 * long-running server that hasn't renewed wouldn't catch a clock
 * rollback until next renewal.
 */
function bumpWallclock() {
  const seal = readSealFile();
  if (!seal) return; // nothing to anchor against yet
  const now = Date.now();
  const lastMs = new Date(seal.last_wallclock_iso).getTime();
  if (now > lastMs) {
    seal.last_wallclock_iso = new Date(now).toISOString();
    writeSealFile(seal);
  }
}

module.exports = {
  validateAgainstSeal,
  advanceSeal,
  bumpWallclock,
  readSealFile,
  getSealFilePath,
};
