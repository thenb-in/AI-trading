'use strict';

const crypto = require('crypto');

/**
 * Generate the per-request PKCE material: a code verifier + its S256 challenge,
 * plus CSRF `state` and replay-protection `nonce`.
 */
function createPkceChallenge() {
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
  const state = crypto.randomBytes(16).toString('base64url');
  const nonce = crypto.randomBytes(16).toString('base64url');
  return { codeVerifier, codeChallenge, state, nonce };
}

module.exports = { createPkceChallenge };
