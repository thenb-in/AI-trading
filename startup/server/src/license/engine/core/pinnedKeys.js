'use strict';

// The set of wallet public keys this verifier accepts. Bundling more than
// one key supports rotation: when the wallet rotates its signing key, we
// add the new key here and ship a build before the wallet starts issuing
// under it. Until all in-the-field licenses have been renewed under the
// new key, both keys must remain pinned.
//
// Resolution order:
//   1. `LICENSE_WALLET_PUBLIC_KEYS` env var: a JSON array of PEM strings.
//      Highest priority — operator-controlled.
//   2. `<SECRET_DIR>/wallet_public_keys.json` file: same shape, baked in
//      by the installer or by `npm run license:install --keys ...`.
//   3. Compiled-in BAKED_KEYS array below. This is the fallback that
//      ships in every bytenode build. Edit the constant during release
//      cuts; the .jsc-compiled file makes it materially harder to swap
//      this out post-build (an attacker would have to patch bytenode-
//      compiled code, not just edit a config file).
//
// At least one PEM must resolve from somewhere, or boot fails fast.

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const logger = require('../../../../logger');
const env = require('../../../config/env');
const { WALLET_KEYS_FILENAME } = require('../../../constants/license');

// ─── BAKED_KEYS ─────────────────────────────────────────────────────────────
// Replace these PEM strings with the wallet's public keys at release-cut
// time. Multiple keys here = trust set during rotation. The build pipeline
// can also rewrite this array as part of the bytenode build step before
// compilation, so the constants are sealed into the .jsc binary.
//
// During development, leaving this empty is OK as long as
// LICENSE_WALLET_PUBLIC_KEYS or the keys file is provided.
const BAKED_KEYS = Object.freeze([
  '-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEAR8N7By4sf8XGHc40VbXUn09qKET8cOI75QXriLYoct8=\n-----END PUBLIC KEY-----\n'
]);

function parseFromEnv() {
  const raw = env.LICENSE_WALLET_PUBLIC_KEYS;
  if (!raw) {
    return null;
  }
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) {
      logger.warn(`[license] LICENSE_WALLET_PUBLIC_KEYS is not a JSON array (got ${typeof arr}); ignoring`);
      return null;
    }
    return arr.filter(s => typeof s === 'string' && s.includes('BEGIN PUBLIC KEY'));
  } catch (err) {
    logger.warn(`[license] LICENSE_WALLET_PUBLIC_KEYS parse failed: ${err.message}`);
    return null;
  }
}

function parseFromFile() {
  const file = path.join(env.SECRET_DIR, WALLET_KEYS_FILENAME);
  if (!fs.existsSync(file)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(file, 'utf8');
    const parsed = JSON.parse(raw);
    const arr = Array.isArray(parsed) ? parsed
      : Array.isArray(parsed.keys) ? parsed.keys.map(k => (typeof k === 'string' ? k : k.public_pem))
        : null;
    if (!arr) {
      return null;
    }
    return arr.filter(s => typeof s === 'string' && s.includes('BEGIN PUBLIC KEY'));
  } catch (err) {
    logger.warn(`[license] wallet_public_keys.json read failed: ${err.message}`);
    return null;
  }
}

let cached = null;

// Licenses are signed with Ed25519, so a PEM that OpenSSL cannot decode — or
// one carrying any other algorithm — can never verify a license. Pinning it
// anyway is worse than pinning nothing: the trust set looks configured, the
// gate arms, and every license is then rejected. Drop such keys here, naming
// the source that supplied them so a support engineer can see which file or
// env var to fix.
function usableKeys(pems, source) {
  return (pems || []).filter((pem) => {
    try {
      const type = crypto.createPublicKey({ key: pem, format: 'pem' }).asymmetricKeyType;
      if (type !== 'ed25519') {
        logger.warn(`[license] ignoring a ${type} public key from ${source}; licenses are signed with Ed25519`);
        return false;
      }
      return true;
    } catch (err) {
      logger.warn(`[license] ignoring an undecodable public key from ${source}: ${err.message}`);
      return false;
    }
  });
}

function load() {
  if (cached) {
    return cached;
  }
  const fromEnv = usableKeys(parseFromEnv(), 'LICENSE_WALLET_PUBLIC_KEYS');
  if (fromEnv.length > 0) {
    logger.info(`[license] loaded ${fromEnv.length} wallet public key(s) from env`);
    cached = fromEnv;
    return cached;
  }
  const fromFile = usableKeys(parseFromFile(), path.join(env.SECRET_DIR, WALLET_KEYS_FILENAME));
  if (fromFile.length > 0) {
    logger.info(`[license] loaded ${fromFile.length} wallet public key(s) from secrets file`);
    cached = fromFile;
    return cached;
  }
  const baked = usableKeys(BAKED_KEYS, 'the baked-in BAKED_KEYS set');
  if (baked.length > 0) {
    logger.info(`[license] using ${baked.length} baked-in wallet public key(s)`);
    cached = baked;
    return cached;
  }
  // Returning empty here is deliberate. The license service detects the
  // empty trust set and fails boot in production, but development can
  // proceed (the gate is off when no keys are pinned, like an unconfigured
  // build talking to a dev environment).
  cached = [];
  return cached;
}

function isConfigured() {
  return load().length > 0;
}

// Test hook: clear the cache so a test can reseed env/file and re-load.
function _reset() {
  cached = null;
}

module.exports = { load, isConfigured, _reset };
