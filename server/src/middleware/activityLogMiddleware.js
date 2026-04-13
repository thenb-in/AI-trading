const userService = require('@services/startup/userService');
const jwt = require('jsonwebtoken');
const logger = require('../../logger');
const env = require('../config/env');
const allowedPermissions = require('../utils/startup/allowedPermissions');
const { setAuthCookies, performTokenRefresh, rotateTokens, authenticateRequest } = require('../utils/startup/authShared');
const { verifyToken } = require('../utils/startup/authUtils');

const refreshTokenLocks = new Map();

const handleRefreshToken = async (refreshToken) => {
  let decoded;
  try {
    decoded = verifyToken(refreshToken, env.REFRESH_TOKEN_SECRET);
  } catch (err) {
    const unverified = jwt.decode(refreshToken);
    const userId = unverified?.id || 'unknown';
    let username = 'unknown';
    if (unverified?.id) {
      try {
        const user = await userService.getUserById(unverified.id);
        username = user?.username || 'unknown';
      } catch (fetchErr) {
        logger.warn(`Could not fetch username for expired token user: ${fetchErr.message}`);
      }
    }
    logger.warn(`Refresh token verification failed for user ${userId} (${username}): ${err.message}`);
    throw new Error(`Invalid refresh token received for user ${userId} (${username}): ${err.message}`);
  }

  return performTokenRefresh({
    refreshToken,
    tokenKey: decoded.id,
    locks: refreshTokenLocks,
    decoded,
    gracePeriodMs: 5000,
    onRotate: async (user, decodedPayload, tx) => {
      const oldRefreshExpiry = decodedPayload.exp ? new Date(decodedPayload.exp * 1000).toISOString() : 'unknown';
      logger.debug(`Cid:${decodedPayload.company_id} - Rotating tokens for user ${user.id}; old refresh token expired at ${oldRefreshExpiry}`);

      const result = await rotateTokens(user, decodedPayload, tx);

      const newAccessDecoded = jwt.decode(result.tokens.access);
      const newRefreshDecoded = jwt.decode(result.tokens.refresh);
      const newAccessExpiry = newAccessDecoded?.exp ? new Date(newAccessDecoded.exp * 1000).toISOString() : 'unknown';
      const newRefreshExpiry = newRefreshDecoded?.exp ? new Date(newRefreshDecoded.exp * 1000).toISOString() : 'unknown';
      logger.debug(`Cid:${decodedPayload.company_id} - Refreshed tokens for user ${user.id}; new access expires at ${newAccessExpiry}, new refresh expires at ${newRefreshExpiry}`);

      return { ...result, isRefresher: true };
    }
  });
};

exports.protect = async (req, res, next) => {
  try {
    // Mobile clients send tokens via headers (Authorization + X-Refresh-Token).
    // Web clients send via cookies.
    // IMPORTANT: if Authorization header is present, use ONLY header tokens.
    // Never mix header access token with cookie refresh token — the WebView's
    // persistent cookie store can hold stale cookies from a previous session,
    // causing a refresh-token mismatch even after a fresh login.
    const authHeader = req.headers.authorization;
    const usingHeaderAuth = authHeader?.startsWith('Bearer ');
    const accessToken = usingHeaderAuth
      ? authHeader.slice(7)
      : req.cookies?.accessToken;
    const refreshToken = usingHeaderAuth
      ? req.headers['x-refresh-token']
      : req.cookies?.refreshToken;

    const authResult = await authenticateRequest({ accessToken, refreshToken, handleRefreshToken });
    if (authResult.error) {
      return res.status(authResult.error.status).json({
        message: authResult.error.message,
        requiresLogin: authResult.error.requiresLogin
      });
    }
    req.user = authResult.user;

    if (authResult.refreshResult) {
      // Make the new access token available on req so downstream middleware/handlers
      // can use it directly without waiting for the next request cycle.
      req.cookies.accessToken = authResult.refreshResult.tokens.access;
      if (authResult.refreshResult.isRefresher) {
        setAuthCookies(res, authResult.refreshResult.tokens, authResult.refreshResult.options);
        // Also expose new tokens in headers for mobile clients
        // (React Native cannot read httpOnly Set-Cookie headers)
        res.set('x-new-access-token', authResult.refreshResult.tokens.access);
        res.set('x-new-refresh-token', authResult.refreshResult.tokens.refresh);
        logger.info(`Tokens refreshed for user ${authResult.user.id}`);
      }
    }

    return next();
  } catch (err) {
    if (err.message?.includes('refresh token') || err.message?.includes('Invalid')) {
      logger.error('Refresh token failed', err);
      return res.status(400).json({ message: 'Your session has expired. Please refresh the page or log in again to continue.', requiresLogin: false });
    }
    logger.error('Auth middleware error', err);
    res.status(500).json({ message: `Internal server error ${err.message}` });
  }
};

exports.admin = async (req, res, next) => {
  const hasPermission = await allowedPermissions(req.user.id, ['Admin']);
  if (!hasPermission) {
    return res.status(403).json({ error: `You are not authorized to access this resource Admin ${req.user.id}` });
  }
  next();
};
