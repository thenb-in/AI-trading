'use strict';

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const logger = require('../../../logger');
const env = require('../../config/env');

const JWKS_TTL_MS = 10 * 60 * 1000;
let cachedJwksKeys = null; // { [kid]: pemPublicKey }
let cachedJwksUri = null;
let cachedJwksAt = 0;

// Fetch the issuer JWKS and index signing keys by kid as PEM (built-in crypto
// converts each JWK → SPKI PEM; no external JWKS library needed). Cached with a
// TTL, and force-refreshed when the requested kid is unknown (key rotation).
async function getSigningKey(jwksUri, kid) {
  const stale = !cachedJwksKeys
    || cachedJwksUri !== jwksUri
    || Date.now() - cachedJwksAt > JWKS_TTL_MS
    || !cachedJwksKeys[kid];

  if (stale) {
    const res = await fetch(jwksUri);
    if (!res.ok) {
      throw new Error(`JWKS fetch failed: ${res.status}`);
    }
    const { keys } = await res.json();
    const map = {};
    for (const jwk of keys || []) {
      if (!jwk.kid) {
        continue;
      }
      try {
        map[jwk.kid] = crypto
          .createPublicKey({ key: jwk, format: 'jwk' })
          .export({ type: 'spki', format: 'pem' });
      } catch (err) {
        logger.warn(`[oidc-rp] skipping unusable JWKS key kid=${jwk.kid}: ${err.message}`);
      }
    }
    cachedJwksKeys = map;
    cachedJwksUri = jwksUri;
    cachedJwksAt = Date.now();
  }

  const pem = cachedJwksKeys[kid];
  if (!pem) {
    throw new Error(`No JWKS signing key for kid=${kid}`);
  }
  return pem;
}

/**
 * Verify an id_token: RS256 signature against the issuer JWKS, plus iss / aud /
 * exp, and the replay-protecting nonce we sent in the authorize request.
 */
async function verifyIdToken(idToken, metadata, expectedNonce) {
  if (!idToken || typeof idToken !== 'string') {
    throw { status: 401, message: 'OIDC id_token missing' };
  }
  if (!metadata.jwks_uri) {
    throw { status: 502, message: 'OIDC issuer exposes no jwks_uri' };
  }

  const decoded = jwt.decode(idToken, { complete: true });
  if (!decoded || !decoded.header || !decoded.header.kid) {
    throw { status: 401, message: 'Invalid OIDC id_token header' };
  }

  let pem;
  try {
    pem = await getSigningKey(metadata.jwks_uri, decoded.header.kid);
  } catch (err) {
    logger.error(`[oidc-rp] JWKS key resolution failed: ${err.message}`, err);
    throw { status: 401, message: 'Invalid OIDC id_token' };
  }

  let payload;
  try {
    payload = jwt.verify(idToken, pem, {
      algorithms: ['RS256'],
      issuer: metadata.issuer || env.OIDC_ISSUER.replace(/\/$/, ''),
      audience: env.APP_KEY,
      clockTolerance: 60
    });
  } catch (err) {
    logger.error(`[oidc-rp] id_token verification failed: ${err.message}`, err);
    throw { status: 401, message: 'Invalid OIDC id_token' };
  }

  // We always send a nonce in /authorize, so a conformant IdP must echo it back.
  if (expectedNonce && payload.nonce !== expectedNonce) {
    throw { status: 401, message: 'Invalid OIDC nonce' };
  }
  return payload;
}

/**
 * Verify a Back-Channel Logout token (OIDC Back-Channel Logout 1.0 §2.6).
 *
 * This arrives on a public endpoint straight from the IdP with no session and no
 * cookies — the signature IS the authentication, so every check below is load
 * bearing. Anyone can POST to that URL; only the issuer can sign this.
 *
 * Same shape as an id_token but with two rules that inverted: it MUST carry the
 * backchannel-logout event, and it MUST NOT carry a nonce. The nonce ban is what
 * stops an id_token — which a client legitimately holds — from being replayed
 * here to force-log-out someone else.
 *
 * @param {string} logoutToken - The signed JWT from the IdP
 * @param {object} metadata - OIDC provider metadata (needs jwks_uri, issuer)
 * @returns {Promise<object>} Verified claims (sub and/or sid)
 * @throws {{status: number, message: string}} 400 on anything unverifiable
 */
async function verifyLogoutToken(logoutToken, metadata) {

  const reject = (detail) => ({ status: 400, message: `Logout token ${detail}` });

  if (!logoutToken || typeof logoutToken !== 'string') {
    throw reject('missing');
  }
  if (!metadata.jwks_uri) {
    throw { status: 502, message: 'OIDC issuer exposes no jwks_uri' };
  }

  const decoded = jwt.decode(logoutToken, { complete: true });
  if (!decoded?.header?.kid) {
    throw reject('has a bad header');
  }

  let payload;
  try {
    const pem = await getSigningKey(metadata.jwks_uri, decoded.header.kid);
    payload = jwt.verify(logoutToken, pem, {
      algorithms: ['RS256'],
      issuer: metadata.issuer || env.OIDC_ISSUER.replace(/\/$/, ''),
      audience: env.APP_KEY,
      clockTolerance: 60
    });
  } catch (err) {
    logger.error(`[oidc-rp] logout token verification failed: ${err.message}`, err);
    throw reject('rejected');
  }

  // Without this an id_token would satisfy every other check here, and any
  // client holding one could log the user out of this app at will.
  if (payload.nonce !== undefined) {
    throw reject('has a nonce');
  }
  // The event that makes this a logout token rather than an id_token
  // (OIDC Back-Channel Logout 1.0 §2.4 — the URI is the spec's, verbatim).
  if (!payload.events?.['http://schemas.openid.net/event/backchannel-logout']) {
    throw reject('has no logout event');
  }
  // Nothing to act on otherwise — the spec requires at least one.
  if (!payload.sub && !payload.sid) {
    throw reject('has no sub or sid');
  }
  return payload;
}

module.exports = { verifyIdToken, verifyLogoutToken };
