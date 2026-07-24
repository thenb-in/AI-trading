'use strict';

const logger = require('../../logger');
const env = require('../config/env');
const { setAuthCookies } = require('../utils/auth_shared_utils');
const { OIDC_ID_TOKEN_COOKIE } = require('../constants/oidc');
const {
  setRoundTripCookies,
  readRoundTripCookies,
  clearRoundTripCookies,
  setErrorCookie,
  frontendRedirect
} = require('./utils/httpCookies');
const { createPkceChallenge } = require('./utils/pkce');
const {
  buildAuthorizationUrl,
  exchangeAuthorizationCode,
  buildEndSessionUrl
} = require('./engine/oidcClient');
const { getOidcProviderMetadata } = require('./engine/oidcProviderMetadata');
const { verifyLogoutToken } = require('./engine/tokenVerifier');
const { completeSsoRoundTrip } = require('./services/ssoLoginService');
const { endSessionForWalletAccount } = require('./services/ssoLogoutService');
const { sendError } = require('../utils/response');

/**
 * GET /auth/sso/start — begin Auth Code + PKCE (redirect to Wallet).

 */
async function startSso(req, res) {
  try {
    const { codeVerifier, codeChallenge, state, nonce } = createPkceChallenge();

    setRoundTripCookies(res, {
      codeVerifier,
      state,
      nonce,
      returnTo: req.query.returnTo ? String(req.query.returnTo).slice(0, 500) : null
    });

    const authorizationUrl = await buildAuthorizationUrl({ codeChallenge, state, nonce });
    return res.redirect(authorizationUrl);
  } catch (error) {
    logger.error(`[oidc-rp] start failed: ${error.message}`, error);
    const status = error.status || 500;
    if (req.accepts('html')) {
      return res.redirect(frontendRedirect('/', { sso_error: error.message || 'SSO start failed' }));
    }
    return sendError(res, { statusCode: status, message: error.message || 'SSO start failed' });
  }
}

/**
 * GET /auth/sso/callback — exchange code, mint local JWT bridge cookies.
 */
async function ssoCallback(req, res) {
  let idToken = null;
  try {
    if (req.query.error) {
      clearRoundTripCookies(res);
      return res.redirect(frontendRedirect('/', {
        sso_error: req.query.error_description || req.query.error
      }));
    }
    const {
      codeVerifier,
      state: expectedState,
      nonce: expectedNonce,
      returnTo
    } = readRoundTripCookies(req);

    if (!codeVerifier || !expectedState || !expectedNonce) {
      clearRoundTripCookies(res);
      return res.redirect(frontendRedirect('/', { sso_error: 'SSO session expired. Try again.' }));
    }

    const exchanged = await exchangeAuthorizationCode({
      code: req.query.code,
      receivedState: req.query.state,
      expectedState,
      codeVerifier,
      expectedNonce
    });
    idToken = exchanged.idToken;

    const { user, accessToken, refreshToken } = await completeSsoRoundTrip(exchanged.userClaims);

    clearRoundTripCookies(res);
    setAuthCookies(res, { access: accessToken, refresh: refreshToken });
    if (idToken) {
      res.cookie(OIDC_ID_TOKEN_COOKIE, idToken, {
        httpOnly: true,
        sameSite: 'lax',
        secure: env.isSecureCookie,
        maxAge: env.MAX_JWT_REFRESH_EXPIRATION_MS,
        path: '/'
      });
    }

    logger.info(`[oidc-rp] SSO login success user=${user.id}`);
    const spaLandingPath = typeof returnTo === 'string' && returnTo.startsWith('/') && returnTo !== '/'
      ? returnTo
      : '/admin';
    return res.redirect(frontendRedirect('/', { sso: '1', returnTo: spaLandingPath }));
  } catch (error) {
    clearRoundTripCookies(res);
    const message = error.message || 'SSO login failed';
    logger.error(`[oidc-rp] callback failed: ${message}`, error);

    const ssoLogoutUrl = idToken
      ? await buildEndSessionUrl({ idToken, state: 'login_rejected' })
      : null;
    if (ssoLogoutUrl) {
      setErrorCookie(res, message);
      return res.redirect(ssoLogoutUrl);
    }

    // Failed before the exchange, so there is no session of ours to end.
    return res.redirect(frontendRedirect('/', { sso_error: message }));
  }
}

async function ssoBackchannelLogout(req, res) {
  try {
    const metadata = await getOidcProviderMetadata();
    const claims = await verifyLogoutToken(req.body?.logout_token, metadata);
    await endSessionForWalletAccount(claims);

    // §2.8: no-store, so an intermediary cannot replay the response.
    res.set('cache-control', 'no-store');
    return res.status(200).json({ ok: true });
  } catch (error) {
    logger.error(`[oidc-rp] backchannel logout failed: ${error.message}`, error);
    return res.status(error.status || 400).json({ error: error.message });
  }
}

module.exports = { startSso, ssoCallback, ssoBackchannelLogout };
