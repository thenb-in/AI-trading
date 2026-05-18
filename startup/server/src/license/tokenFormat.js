'use strict';

// Verifier-side codec. KEEP IN BYTE-FOR-BYTE SYNC with the wallet's
// `nbnext_wallet/server/src/services/license/tokenFormat.js`. The format
// is the contract between issuer and verifier; drift breaks every
// license in the field.
//
// Format:  NBLIC1.<base64url(payload_json)>.<base64url(signature)>
//
// The signature is computed over the ASCII bytes of
// "NBLIC1.<base64url(payload_json)>" using Ed25519. We expose only the
// verify path here — the framework never signs anything; that's the
// wallet's exclusive job.

const crypto = require('crypto');
const { LICENSE_TOKEN_HEADER, ED25519_SIGNATURE_BYTES } = require('../constants/license');

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
  if (sig.length !== ED25519_SIGNATURE_BYTES) {
    return { ok: false, reason: 'bad-signature-length' };
  }

  const keys = Array.isArray(publicKey) ? publicKey : [publicKey];
  const signingInput = Buffer.from(`${LICENSE_TOKEN_HEADER}.${payloadB64}`, 'utf8');

  let validKeyIndex = -1;
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    if (!k) {
      continue;
    }
    const keyObj = typeof k === 'string'
      ? crypto.createPublicKey({ key: k, format: 'pem' })
      : k;
    if (crypto.verify(null, signingInput, keyObj, sig)) {
      validKeyIndex = i;
      break;
    }
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
