const logger = require('../../logger');
const env = require('../config/env');
const db = require('../models');
const userService = require('../services/startup/userService');
const allowedPermissions = require('../utils/startup/allowedPermissions');
const { verifyToken, generateAccessToken, generateRefreshToken } = require('../utils/startup/authUtils');

/** In-memory map to deduplicate concurrent refresh token rotations per user. */
const refreshTokenLocks = new Map();

/**
 * Sets access token, refresh token, and isLoggedIn cookies on the response.
 * @param {Object} res - Express response object
 * @param {{ access: string, refresh: string }} tokens - Token values to set
 * @param {{ access: Object, refresh: Object, isLoggedIn: Object }} options - Cookie options per token
 */
const setAuthCookies = (res, tokens, options) => {
  res.cookie('accessToken', tokens.access, options.access);
  res.cookie('refreshToken', tokens.refresh, options.refresh);
  res.cookie('isLoggedIn', 'true', options.isLoggedIn);
};
/**
 * Checks if a user is active and approved in the database.
 * @param {string|number} userId - User ID to check
 * @returns {Promise<boolean>} True if the user is active and approved
 */
const checkUserActive = async (userId) => {
  const { isActive, user } = await userService.checkUserActive(userId);
  if (!isActive) {
    logger.error(`User inactive or not found ${user ? user.username : userId}`);
    return false;
  }
  return true;
};
/**
 * Validates a JWT access token and returns the decoded payload.
 * @param {string|null} accessToken - JWT access token string
 * @returns {Object|null} Decoded token payload { id, company_id } or null if invalid/missing
 */
const validateAccessToken = (accessToken) => {
  if (!accessToken) {
    return null;
  }
  try {
    return verifyToken(accessToken, env.JWT_SECRET);
  } catch (err) {
    logger.warn(`Access token invalid: ${err.message}`);
    return null;
  }
};

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
  // verify refresh token first
  let decoded;
  try {
    decoded = verifyToken(refreshToken, env.REFRESH_TOKEN_SECRET);
  } catch (err) {
    logger.warn(`Refresh token verification failed: ${err.message}`);
    throw new Error(`Invalid refresh token received: ${err.message}`);
  }

  // Use the raw refresh token string as the lock key so callers using the same token collide.
  const tokenKey = refreshToken;

  // If a refresh for THIS exact token is already running, reuse its promise.
  if (refreshTokenLocks.has(tokenKey)) {
    logger.debug(`Reusing in-flight refresh for tokenKey (user:${decoded.id})`);
    return refreshTokenLocks.get(tokenKey);
  }

  // Create a deferred placeholder and set it immediately so concurrent requests will await it.
  let resolveDeferred, rejectDeferred;
  const deferredPromise = new Promise((resolve, reject) => {
    resolveDeferred = resolve; rejectDeferred = reject;
  });
  refreshTokenLocks.set(tokenKey, deferredPromise);
  logger.debug(`Placed placeholder for tokenKey (user:${decoded.id})`);

  (async () => {
    const tx = await db.sequelize.transaction();
    try {
      const user = await userService.getUserByPkWithLock(decoded.id, {
        attributes: ['id', 'isActive', 'refresh_token', 'company_id', 'username'],
        lock: tx.LOCK.UPDATE,
        transaction: tx
      });

      if (!user) {
        logger.error(`User not found ${decoded.id}`);
        if (!tx.finished) {
          await tx.rollback();
        }
        return rejectDeferred(new Error(`User not found ${decoded.id}`));
      }

      if (!user.isActive) {
        logger.error(`User inactive ${user.username || decoded.id}`);
        if (!tx.finished) {
          await tx.rollback();
        }
        return rejectDeferred(new Error(`User inactive ${user.username || decoded.id}`));
      }

      // If stored refresh token doesn't match the presented one, it was rotated earlier.
      if (user.refresh_token !== refreshToken) {
        logger.info(`Refresh token mismatch for user ${user.username || decoded.id}. Possible concurrent rotation.`);

        if (!tx.finished) {
          await tx.rollback();
        }

        // Try to reuse another existing promise keyed by tokenKey (someone else might be handling it).
        const other = refreshTokenLocks.get(tokenKey);
        if (other && other !== deferredPromise) {
          // another promise exists — await and propagate its result
          try {
            const res = await other;
            resolveDeferred(res);
            return;
          } catch (err) {
            rejectDeferred(err);
            return;
          }
        }
        // No other promise to reuse—fail
        logger.error(`Invalid or rotated refresh token for user ${user.username || decoded.id}`);
        return rejectDeferred(new Error(`Invalid or rotated refresh token for user ${user.username || decoded.id}`));
      }

      // Token matches and user active — rotate token
      const newAccess = generateAccessToken({ id: user.id, company_id: decoded.company_id });
      const newRefresh = await generateRefreshToken({ id: user.id, company_id: decoded.company_id });
      await userService.updateUserRefreshToken(user.id, newRefresh, tx);
      await tx.commit();

      const accessMax = parseInt(env.MAX_JWT_ACCESS_EXPIRATION_MS || 300000);
      const refreshMax = parseInt(env.MAX_JWT_REFRESH_EXPIRATION_MS || 604800000);
      logger.debug(`Cid:${decoded.company_id} - Refreshed tokens for user ${user.id}`);

      const result = {
        user: { id: user.id, company_id: decoded.company_id || user.company_id },
        tokens: { access: newAccess, refresh: newRefresh },
        options: {
          access:  { httpOnly: true, sameSite: 'strict', secure: env.NODE_ENV === 'production', maxAge: accessMax },
          refresh: { httpOnly: true, sameSite: 'strict', secure: env.NODE_ENV === 'production', maxAge: refreshMax },
          isLoggedIn: { sameSite: 'strict', secure: env.NODE_ENV === 'production', maxAge: refreshMax }
        }
      };

      // Resolve deferred so all waiters receive same result
      resolveDeferred(result);
      return;
    } catch (e) {
      try {
        if (!tx.finished) {
          await tx.rollback();
        }
      } catch (rb) {
        logger.error(`Rollback failed: ${rb.message}`, rb);
      }

      logger.error(`Error in handling refresh token (user:${decoded.id}): ${e.message || e}`,e);
      rejectDeferred(new Error(`Error in handling refresh token ${decoded.id}: ${e.message || e}`));
      return;
    } finally {
      // keep the lock present for a short grace window to let near-simultaneous requests reuse it.
      setTimeout(() => {
        // Only delete if the current map entry is our deferredPromise
        if (refreshTokenLocks.get(tokenKey) === deferredPromise) {
          refreshTokenLocks.delete(tokenKey);
          logger.debug(`Cleared refreshTokenLocks for tokenKey (user:${decoded.id})`);
        }
      }, 1500); // 1.5s grace period — tune as needed
    }
  })();

  // return the deferred promise so callers will await the resolution
  return deferredPromise;
};

/**
 * Authentication middleware. Validates the access token from cookies (or Authorization header
 * for mobile clients). If the access token is expired, attempts to rotate the refresh token.
 * On success, sets req.user = { id, company_id } and calls next().
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 * @returns {Promise<void>}
 */
exports.protect = async (req, res, next) => {
  try {
    const { accessToken, refreshToken } = req.cookies || {};
    if (!accessToken && !refreshToken) {
      return res.status(401).json({ message: 'No token found', requiresLogin: true });
    }

    const decoded = validateAccessToken(accessToken);
    if (decoded) {
      const isApproved = await checkUserActive(decoded.id);
      if (!isApproved) {
        return res.status(401).json({ message: 'User is not approved', requiresLogin: true });
      }
      req.user = { id: decoded.id, company_id: decoded.company_id };
      return next();
    }

    if (!refreshToken) {
      return res.status(401).json({ message: 'Session expired', requiresLogin: true });
    }

    try {
      const result = await handleRefreshToken(refreshToken);
      const isApproved = await checkUserActive(result.user.id);
      if (!isApproved) {
        return res.status(401).json({ message: 'User is not approved', requiresLogin: true });
      }
      req.user = result.user;
      setAuthCookies(res, result.tokens, result.options);
      logger.info(`Tokens refreshed for user ${result.user.id}`);
      return next();
    } catch (err) {
      logger.error('Refresh token failed', err);
      return res.status(400).json({ message: 'Your session has expired. Please refresh the page or log in again to continue.', requiresLogin: true });
    }
  } catch (error) {
    logger.error('Auth middleware error', error);
    res.status(500).json({ message: `Internal server error ${error.message}` });
  }
};

/**
 * Admin authorization middleware. Checks that the authenticated user has the "Admin" permission.
 * Must be used after the protect middleware.
 * @param {Object} req - Express request (must have req.user.id)
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 * @returns {Promise<void>}
 */
exports.admin = async (req, res, next) => {
  const hasPermission = await allowedPermissions(req.user.id, ['Admin']);
  if (!hasPermission) {
    return res.status(403).json({ error: `You are not authorized to access this resource Admin ${req.user.id}` });
  }
  next();
};
