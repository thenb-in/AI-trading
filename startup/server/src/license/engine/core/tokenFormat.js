'use strict';

// The license token codec, and the whole of it that a verifier needs. The
// format is the contract between issuer and verifier, so the issuer reads its
// encoding and verification from right here rather than keeping a copy in
// step by hand — see app/server/src/services/license/tokenFormat.js, which
// adds the signing half.
//
// Format:  NBLIC1.<base64url(payload_json)>.<base64url(signature)>
//
// The signature is computed over the ASCII bytes of
// "NBLIC1.<base64url(payload_json)>" using Ed25519. No signing path lives
// here — putting a license's name to it is the wallet's exclusive job, and
// this module ships to machines that only ever check one.

const crypto = require('crypto');
const { LICENSE_TOKEN_HEADER, ED25519_SIGNATURE_BYTES } = require('../../../constants/license');

function b64uEncode(buf) {
  return Buffer.from(buf)
    .toString('base64')
    .replace(/=+$/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function b64uDecode(str) {
  const padLen = (4 - (str.length % 4)) % 4;
  const padded = str.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(padLen);
  return Buffer.from(padded, 'base64');
}

/**
 * Verify a token against one or more pinned public keys. Returns
 * `{ ok: true, payload, keyIndex }` or `{ ok: false, reason }`.
 * NEVER throws.
 *
 * @param {string} token
 * @param {string|crypto.KeyObject|Array<string|crypto.KeyObject>} publicKey
 */
function verifyToken(token, publicKey) {
  if (typeof token !== 'string' || token.length < LICENSE_TOKEN_HEADER.length + 4) {
    return { ok: false, reason: 'bad-format' };
  }
  const parts = token.split('.');
  if (parts.length !== 3) {
    return { ok: false, reason: 'bad-format' };
  }
  const [hdr, payloadB64, sigB64] = parts;
  if (hdr !== LICENSE_TOKEN_HEADER) {
    return { ok: false, reason: 'bad-version' };
  }

  let sig;
  try {
    sig = b64uDecode(sigB64);
  } catch {
    return { ok: false, reason: 'bad-signature-encoding' };
  }
  // Ed25519 signatures are always exactly 64 bytes. Reject obvious garbage
  // up-front so we don't waste a crypto.verify on it.
  if (sig.length !== ED25519_SIGNATURE_BYTES) {
    return { ok: false, reason: 'bad-signature-length' };
  }

  const keys = Array.isArray(publicKey) ? publicKey : [publicKey];
  const signingInput = Buffer.from(`${LICENSE_TOKEN_HEADER}.${payloadB64}`, 'utf8');

  // A pinned PEM that OpenSSL cannot decode makes createPublicKey throw, which
  // would break this function's NEVER-throws contract and surface on the
  // installer as a bare `DECODER routines::unsupported`. Catch it per key, keep
  // trying the rest of the set, and report what was wrong with which key.
  let validKeyIndex = -1;
  const keyErrors = [];
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    if (!k) {
      continue;
    }
    try {
      const keyObj = typeof k === 'string'
        ? crypto.createPublicKey({ key: k, format: 'pem' })
        : k;
      if (crypto.verify(null, signingInput, keyObj, sig)) {
        validKeyIndex = i;
        break;
      }
    } catch (err) {
      keyErrors.push(`pinned key ${i} is unusable (${err.message})`);
    }
  }
  if (validKeyIndex === -1 && keyErrors.length > 0) {
    return { ok: false, reason: `unusable-pinned-key: ${keyErrors.join('; ')}` };
  }
  if (validKeyIndex === -1) {
    return { ok: false, reason: 'bad-signature' };
  }

  let payload;
  try {
    payload = JSON.parse(b64uDecode(payloadB64).toString('utf8'));
  } catch {
    return { ok: false, reason: 'bad-payload-json' };
  }
  if (!payload || typeof payload !== 'object') {
    return { ok: false, reason: 'bad-payload-shape' };
  }
  return { ok: true, payload, keyIndex: validKeyIndex };
}

/**
 * Decodes a token's payload WITHOUT verifying its signature. Use ONLY for
 * inspecting fields needed BEFORE signature verification can be done (e.g.
 * deciding which key in a rotation set to try based on the embedded `key_id`,
 * or reading `license_id` for log lines). NEVER trust the result for
 * authorization decisions.
 */
function decodeUnsafe(token) {
  if (typeof token !== 'string') {
    return null;
  }
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== LICENSE_TOKEN_HEADER) {
    return null;
  }
  try {
    return JSON.parse(b64uDecode(parts[1]).toString('utf8'));
  } catch {
    return null;
  }
}

module.exports = {
  b64uEncode,
  b64uDecode,
  verifyToken,
  decodeUnsafe
};
