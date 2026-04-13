const logger = require('../../logger');
const env = require('../config/env');
const allowedPermissions = require('../utils/startup/allowedPermissions');
const { setAuthCookies, performTokenRefresh, rotateTokens, authenticateRequest } = require('../utils/startup/authShared');
const { verifyToken } = require('../utils/startup/authUtils');

/** In-memory map to deduplicate concurrent refresh token rotations per user. */
const refreshTokenLocks = new Map();

/**
 * Handles refresh token rotation with concurrency-safe deduplication.
 * Uses a deferred promise pattern: the first request performs the DB rotation within a
 * transaction (with row-level locking), and concurrent requests for the same token
 * reuse the same promise. A short grace window prevents the lock from being cleaned up
 * too early.
 * @param {string} refreshToken - Current refresh token from the client
 * @returns {Promise<{ user: Object, tokens: Object, options: Object }>} New tokens and cookie options
 * @throws {Error} If refresh token is invalid, user is inactive, or token was already rotated
 * @side_effects Rotates the stored refresh token in the database
 */
const handleRefreshToken = async (refreshToken) => {
  let decoded;
  try {
    decoded = verifyToken(refreshToken, env.REFRESH_TOKEN_SECRET);
  } catch (err) {
    logger.warn(`Refresh token verification failed: ${err.message}`);
    throw new Error(`Invalid refresh token received: ${err.message}`);
  }

  return performTokenRefresh({
    refreshToken,
    tokenKey: refreshToken,
    locks: refreshTokenLocks,
    decoded,
    gracePeriodMs: 1500,
    onRotate: async (user, decodedPayload, tx) => {
      const result = await rotateTokens(user, decodedPayload, tx);
      logger.debug(`Cid:${decodedPayload.company_id} - Refreshed tokens for user ${user.id}`);
      return result;
    }
  });
};

/**
 * Authentication middleware. Validates the access token from cookies.
 * If the access token is expired, attempts to rotate the refresh token.
 * On success, sets req.user = { id, company_id } and calls next().
 */
exports.protect = async (req, res, next) => {
  try {
    const { accessToken, refreshToken } = req.cookies || {};

    const authResult = await authenticateRequest({ accessToken, refreshToken, handleRefreshToken });
    if (authResult.error) {
      return res.status(authResult.error.status).json({
        message: authResult.error.message,
        requiresLogin: authResult.error.requiresLogin
      });
    }
    req.user = authResult.user;

    if (authResult.refreshResult) {
      setAuthCookies(res, authResult.refreshResult.tokens, authResult.refreshResult.options);
      logger.info(`Tokens refreshed for user ${authResult.user.id}`);
    }

    return next();
  } catch (err) {
    if (err.message?.includes('refresh token') || err.message?.includes('Invalid')) {
      logger.error('Refresh token failed', err);
      return res.status(400).json({ message: 'Your session has expired. Please refresh the page or log in again to continue.', requiresLogin: true });
    }
    logger.error('Auth middleware error', err);
    res.status(500).json({ message: `Internal server error ${err.message}` });
  }
};

/**
 * Admin authorization middleware. Checks that the authenticated user has the "Admin" permission.
 * Must be used after the protect middleware.
 */
exports.admin = async (req, res, next) => {
  const hasPermission = await allowedPermissions(req.user.id, ['Admin']);
  if (!hasPermission) {
    return res.status(403).json({ error: `You are not authorized to access this resource Admin ${req.user.id}` });
  }
  next();
};
