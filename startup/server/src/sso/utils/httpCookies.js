'use strict';
const env = require('../../config/env');
const {
  OIDC_PKCE_COOKIE,
  OIDC_STATE_COOKIE,
  OIDC_NONCE_COOKIE,
  OIDC_RETURN_TO_COOKIE,
  OIDC_ERROR_COOKIE
} = require('../../constants/oidc');

const SHORT_LIVED_ROUND_TRIP_MAX_AGE_MS = 10 * 60 * 1000; // 10 min — one round-trip
const NOTICE_MAX_AGE_MS = 60 * 1000; // long enough for one redirect hop

function roundTripCookieOpts() {
  return {
    httpOnly: true,
    sameSite: 'lax', // 'strict' drops these on the cross-site leg back from Wallet
    secure: env.isSecureCookie,
    maxAge: SHORT_LIVED_ROUND_TRIP_MAX_AGE_MS,
    path: '/'
  };
}

function setRoundTripCookies(res, { codeVerifier, state, nonce, returnTo }) {
  const opts = roundTripCookieOpts();
  res.cookie(OIDC_PKCE_COOKIE, codeVerifier, opts);
  res.cookie(OIDC_STATE_COOKIE, state, opts);
  res.cookie(OIDC_NONCE_COOKIE, nonce, opts);
  if (returnTo) {
    res.cookie(OIDC_RETURN_TO_COOKIE, returnTo, opts);
  }
}

function readRoundTripCookies(req) {
  return {
    codeVerifier: req.cookies?.[OIDC_PKCE_COOKIE],
    state: req.cookies?.[OIDC_STATE_COOKIE],
    nonce: req.cookies?.[OIDC_NONCE_COOKIE],
    returnTo: req.cookies?.[OIDC_RETURN_TO_COOKIE]
  };
}


function clearRoundTripCookies(res) {
  const clear = roundTripCookieOpts();
  delete clear.maxAge;
  res.clearCookie(OIDC_PKCE_COOKIE, clear);
  res.clearCookie(OIDC_STATE_COOKIE, clear);
  res.clearCookie(OIDC_NONCE_COOKIE, clear);
  res.clearCookie(OIDC_RETURN_TO_COOKIE, clear);
}

/**
 * Leaves a message for the SPA to show once the browser gets back here.
 *
 * Deliberately not httpOnly: the SPA reads and clears it. It exists because the
 * browser reaches us via the IdP's logout redirect, whose target is matched
 * exactly against the app's registered origins — so no query string can ride
 * along on that hop.
 *
 * @param {object} res - Express response
 * @param {string} name - Cookie name
 * @param {string} message - User-facing text
 */
function setMessageCookie(res, name, message) {
  res.cookie(name, message, {
    httpOnly: false,
    sameSite: 'lax',
    secure: env.isSecureCookie,
    maxAge: NOTICE_MAX_AGE_MS,
    path: '/'
  });
}

// Wallet authenticated someone this app refused, and we are dropping that
// session on the way out so the user can pick a different account.
function setErrorCookie(res, message) {
  setMessageCookie(res, OIDC_ERROR_COOKIE, message);
}

// Absolute URL back into the SPA (the RP callback redirects the browser here).
function frontendRedirect(path, query) {
  const base = env.FRONTEND_URL.replace(/\/$/, '');
  const qs = query ? `?${new URLSearchParams(query).toString()}` : '';
  return `${base}${path}${qs}`;
}

module.exports = {
  setRoundTripCookies,
  readRoundTripCookies,
  clearRoundTripCookies,
  setErrorCookie,
  frontendRedirect
};
