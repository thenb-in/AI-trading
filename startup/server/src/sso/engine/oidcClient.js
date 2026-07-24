'use strict';

const logger = require('../../../logger');
const env = require('../../config/env');
const { getOidcProviderMetadata } = require('./oidcProviderMetadata');
const { verifyIdToken } = require('./tokenVerifier');


async function buildAuthorizationUrl({ codeChallenge, state, nonce }) {
  const metadata = await getOidcProviderMetadata();
  const params = new URLSearchParams({
    client_id: env.APP_KEY,
    redirect_uri: env.OIDC_REDIRECT_URI,
    response_type: 'code',
    scope: env.OIDC_SCOPES,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state,
    nonce
  });

  return `${metadata.authorization_endpoint}?${params.toString()}`;
}


async function mergeUserinfo(idTokenClaims, tokenSet, metadata) {
  if (!tokenSet.access_token || !metadata.userinfo_endpoint) {
    return idTokenClaims;
  }
  try {
    const userinfoRes = await fetch(metadata.userinfo_endpoint, {
      headers: { Authorization: `Bearer ${tokenSet.access_token}` }
    });
    if (!userinfoRes.ok) {
      return idTokenClaims;
    }
    const userinfo = await userinfoRes.json();

    if (userinfo.sub && userinfo.sub !== idTokenClaims.sub) {
      logger.warn(`[oidc-rp] userinfo sub mismatch (id_token sub=${idTokenClaims.sub}) — ignoring userinfo`);
      return idTokenClaims;
    }
    return { ...idTokenClaims, ...userinfo };
  } catch (err) {
    logger.warn(`[oidc-rp] userinfo failed, using id_token claims: ${err.message}`);
    return idTokenClaims;
  }
}


async function exchangeAuthorizationCode({ code, receivedState, expectedState, codeVerifier, expectedNonce }) {

  if (!code) {
    throw { status: 400, message: `Missing authorization code from ${env.OIDC_ISSUER}` };
  }
  if (!receivedState || receivedState !== expectedState) {
    throw { status: 400, message: 'Invalid OIDC state' };
  }
  const metadata = await getOidcProviderMetadata();
  const tokenRequestForm = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: env.OIDC_REDIRECT_URI,
    client_id: env.APP_KEY,
    code_verifier: codeVerifier
  });
  if (env.OIDC_CLIENT_SECRET) {
    tokenRequestForm.set('client_secret', env.OIDC_CLIENT_SECRET);
  }

  const tokenRes = await fetch(metadata.token_endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: tokenRequestForm
  });
  const tokenSet = await tokenRes.json().catch(() => ({}));
  if (!tokenRes.ok) {
    const reason = tokenSet.error_description || tokenSet.error || `HTTP ${tokenRes.status}`;
    logger.error(`[oidc-rp] token exchange failed: ${reason}`);
    throw { status: 401, message: `Token exchange failed: ${reason}` };
  }

  const idTokenClaims = await verifyIdToken(tokenSet.id_token, metadata, expectedNonce);

  const userClaims = await mergeUserinfo(idTokenClaims, tokenSet, metadata);

  if (!userClaims.sub) {
    throw { status: 401, message: 'OIDC subject missing' };
  }

  return { userClaims, idToken: tokenSet.id_token || null };
}

function isSsoConfigured() {
  return Boolean(env.OIDC_ISSUER && env.APP_KEY);
}


async function buildEndSessionUrl({ idToken = null, postLogoutRedirectUri = null, state = null } = {}) {
  if (!isSsoConfigured()) {
    return null;
  }
  let metadata;
  try {
    metadata = await getOidcProviderMetadata();
  } catch (err) {
    logger.warn(`[oidc-rp] end_session provider metadata fetch failed: ${err.message}`);
    return null;
  }
  const endSession = metadata.end_session_endpoint;
  if (!endSession) {
    logger.warn(`[oidc-rp] Issuer has no end_session_endpoint: ${env.OIDC_ISSUER}`);
    return null;
  }
  const params = new URLSearchParams({ client_id: env.APP_KEY });
  if (idToken) {
    params.set('id_token_hint', idToken);
  }
  // Why we are ending the session. Wallet's wait page reads this to say what is
  // actually happening — the same hop runs after a signup and after a refused
  // login, where "signing you out" is simply untrue.
  if (state) {
    params.set('state', state);
  }
  const postLogout = postLogoutRedirectUri
    || env.OIDC_POST_LOGOUT_REDIRECT_URI
    || env.FRONTEND_URL
    || null;
  if (postLogout) {
    params.set('post_logout_redirect_uri', postLogout.replace(/\/$/, ''));
  }
  return `${endSession}?${params.toString()}`;
}

module.exports = {
  buildAuthorizationUrl,
  exchangeAuthorizationCode,
  buildEndSessionUrl,
  isSsoConfigured
};
