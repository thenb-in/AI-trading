'use strict';

// File + DB persistence for the local license. The token lives in two
// places so a partial-tamper attack (delete file OR truncate row) doesn't
// brick the install OR let an attacker reset state:
//
//   - File: `<SECRET_DIR>/license.token` — the canonical source. Same
//     token on disk the operator received. Mode 0600.
//   - DB: nbnext_license_local row. Mirrors the token + denormalized
//     fields for fast status reads.
//
// Both are written together via `persist()`. Reads prefer the file; if
// the file is missing we attempt the DB row. If they disagree, the
// LATER-issued (higher serial) one wins. We log loudly on disagreement —
// it's a strong tampering signal.

const fs = require('fs');
const path = require('path');
const logger = require('../../logger');
const env = require('../config/env');
const { LICENSE_TOKEN_FILENAME } = require('../constants/license');
const db = require('../models');
const pinnedKeys = require('./pinnedKeys');
const tokenFormat = require('./tokenFormat');

function getLicenseFilePath() {
  return path.join(env.SECRET_DIR, LICENSE_TOKEN_FILENAME);
}

function readFromFile() {
  const file = getLicenseFilePath();
  if (!fs.existsSync(file)) {
    return null;
  }
  try {
    const token = fs.readFileSync(file, 'utf8').trim();
    return token || null;
  } catch (err) {
    logger.warn(`[license] failed to read ${file}: ${err.message}`);
    return null;
  }
}

function writeToFile(token) {
  fs.mkdirSync(env.SECRET_DIR, { recursive: true });
  const file = getLicenseFilePath();
  const tmp = `${file}.tmp.${process.pid}.${Date.now()}`;
  fs.writeFileSync(tmp, `${token}
`, { mode: 0o600 });
  fs.renameSync(tmp, file);
  try {
    fs.chmodSync(file, 0o600);
  } catch { /* noop */ }
}

async function readFromDb() {
  const License = db.License;
  if (!License) {
    return null;
  }
  const row = await License.findOne({ order: [['updated_at', 'DESC']] });
  return row;
}

/**
 * Read the active token, preferring file but falling back to DB. The
 * token returned has been signature-verified against pinned keys; an
 * untrusted token from disk would be rejected here.
 *
 * Returns `{ token, payload, source }` or null.
 */
async function loadVerifiedToken() {
  const keys = pinnedKeys.load();
  if (keys.length === 0) {
    return null;
  }

  const fileToken = readFromFile();
  const dbRow = await readFromDb();
  const dbToken = dbRow?.token || null;

  // Pick the token with the highest verifiable serial. If both are valid
  // and differ, we DON'T silently prefer one — that's the operator's
  // problem to reconcile (a CRITICAL log + status endpoint exposes it).
  const candidates = [];
  if (fileToken) {
    const v = tokenFormat.verifyToken(fileToken, keys);
    if (v.ok) {
      candidates.push({ source: 'file', token: fileToken, payload: v.payload });
    } else {
      logger.warn(`[license] file token failed verify: ${v.reason}`);
    }
  }
  if (dbToken) {
    const v = tokenFormat.verifyToken(dbToken, keys);
    if (v.ok) {
      candidates.push({ source: 'db', token: dbToken, payload: v.payload });
    } else {
      logger.warn(`[license] db token failed verify: ${v.reason}`);
    }
  }
  if (candidates.length === 0) {
    return null;
  }

  candidates.sort((a, b) => (b.payload.serial || 0) - (a.payload.serial || 0));
  const picked = candidates[0];

  if (candidates.length === 2 && candidates[0].payload.serial !== candidates[1].payload.serial) {
    logger.error(
      `[license] file/db serial mismatch — file=${
        candidates.find(c => c.source === 'file')?.payload.serial
      } db=${
        candidates.find(c => c.source === 'db')?.payload.serial
      }; preferring source=${picked.source} serial=${picked.payload.serial}`
    );
  }
  return picked;
}

/**
 * Persist a token to both file and DB. Caller passes the already-verified
 * payload so we don't re-verify here.
 */
async function persist({ token, payload }) {
  writeToFile(token);

  const License = db.License;
  if (!License) {
    logger.warn(`[license] License model not registered; skipped DB persist for license_id=${payload.license_id}`);
    return;
  }

  const fields = {
    licenseId: payload.license_id,
    customerId: payload.customer_id,
    appName: payload.app_name,
    machineFingerprint: payload.machine_fingerprint,
    serial: payload.serial,
    subscriptionId: payload.subscription_id ?? null,
    permissions: payload.permissions ?? [],
    permissionCaps: payload.permission_caps ?? {},
    notBefore: payload.not_before,
    expiresAt: payload.expires_at,
    renewalAfter: payload.renewal_after ?? null,
    renewalMode: payload.renewal_mode || 'online',
    token,
    lastVerifiedAt: new Date()
  };

  const existing = await License.findOne({ where: { licenseId: payload.license_id } });
  if (existing) {
    await existing.update(fields);
  } else {
    await License.create(fields);
  }
}

async function persistSealMirror(seal) {
  const License = db.License;
  if (!License || !seal) {
    return;
  }
  await License.update({
    sealAnchorToken: seal.anchor_token,
    sealHighestSerial: seal.highest_serial,
    sealLastWallclock: seal.last_wallclock_iso
  }, { where: { licenseId: seal.license_id } });
}

async function readDbSeal() {
  const License = db.License;
  if (!License) {
    return null;
  }
  const row = await License.findOne({ order: [['updated_at', 'DESC']] });
  if (!row || !row.sealAnchorToken) {
    return null;
  }
  return {
    license_id: row.licenseId,
    machine_fingerprint: row.machineFingerprint,
    highest_serial: row.sealHighestSerial,
    last_wallclock_iso: row.sealLastWallclock?.toISOString?.() || row.sealLastWallclock,
    anchor_token: row.sealAnchorToken
  };
}

module.exports = {
  getLicenseFilePath,
  loadVerifiedToken,
  persist,
  persistSealMirror,
  readDbSeal
};
