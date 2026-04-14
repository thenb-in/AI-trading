const logger = require('../../../logger');
const env = require('../../config/env');
const db = require('../../models');
const userService = require('../../services/startup/userService');
const { verifyToken, generateAccessToken, generateRefreshToken } = require('./authUtils');

const setAuthCookies = (res, tokens, options) => {
  res.cookie('accessToken', tokens.access, options.access);
  res.cookie('refreshToken', tokens.refresh, options.refresh);
  res.cookie('isLoggedIn', 'true', options.isLoggedIn);
};

const checkUserActive = async (userId) => {
  const { isActive, user } = await userService.checkUserActive(userId);
  if (!isActive) {
    logger.error(`User inactive or not found ${user ? user.username : userId}`);
    return false;
  }
  return true;
};

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
 * Core token refresh handler with deferred-promise deduplication.
 * @param {Object} params
 * @param {string} params.refreshToken - The refresh token from client
 * @param {string} params.tokenKey - Lock map key (userId or token string)
 * @param {Map} params.locks - In-memory lock map for deduplication
 * @param {Object} params.decoded - Decoded refresh token payload
 * @param {Function} params.onRotate - (user, decoded, tx) => result. Called when rotation should happen. Must NOT commit tx.
 * @param {number} [params.gracePeriodMs=1500] - Grace period before clearing the lock entry
 */
const performTokenRefresh = async ({ refreshToken, tokenKey, locks, decoded, onRotate, gracePeriodMs = 1500 }) => {
  if (locks.has(tokenKey)) {
    logger.debug(`Reusing in-flight refresh for tokenKey (user:${decoded.id})`);
    return locks.get(tokenKey);
  }

  let resolveDeferred, rejectDeferred;
  const deferredPromise = new Promise((resolve, reject) => {
    resolveDeferred = resolve; rejectDeferred = reject;
  });
  locks.set(tokenKey, deferredPromise);
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

      if (user.refresh_token !== refreshToken) {
        logger.info(`Refresh token mismatch for user ${user.username || decoded.id}. Possible concurrent rotation.`);
        if (!tx.finished) {
          await tx.rollback();
        }

        const other = locks.get(tokenKey);
        if (other && other !== deferredPromise) {
          try {
            const res = await other;
            resolveDeferred(res);
            return;
          } catch (err) {
            rejectDeferred(err);
            return;
          }
        }
        logger.error(`Invalid or rotated refresh token for user ${user.username || decoded.id}`);
        return rejectDeferred(new Error(`Invalid or rotated refresh token for user ${user.username || decoded.id}`));
      }

      const result = await onRotate(user, decoded, tx);
      await tx.commit();
      resolveDeferred(result);
    } catch (e) {
      try {
        if (!tx.finished) {
          await tx.rollback();
        }
      } catch (rb) {
        logger.error(`Rollback failed: ${rb.message}`, rb);
      }
      logger.error(`Error in handling refresh token (user:${decoded.id}): ${e.message || e}`, e);
      rejectDeferred(new Error(`Error in handling refresh token ${decoded.id}: ${e.message || e}`));
    } finally {
      setTimeout(() => {
        if (locks.get(tokenKey) === deferredPromise) {
          locks.delete(tokenKey);
          logger.debug(`Cleared refreshTokenLocks for tokenKey (user:${decoded.id})`);
        }
      }, gracePeriodMs);
    }
  })();

  return deferredPromise;
};

/**
 * Rotates auth tokens: generates new access/refresh tokens, persists the new
 * refresh token to the DB (within the provided transaction), and builds the
 * standard cookie-options result object.
 */
const rotateTokens = async (user, decoded, tx) => {
  const newAccess = await generateAccessToken({ id: user.id, company_id: decoded.company_id });
  const newRefresh = await generateRefreshToken({ id: user.id, company_id: decoded.company_id });
  await userService.updateUserRefreshToken(user.id, newRefresh, tx);

  const accessMax = parseInt(env.MAX_JWT_ACCESS_EXPIRATION_MS || 300000);
  const refreshMax = parseInt(env.MAX_JWT_REFRESH_EXPIRATION_MS || 604800000);

  return {
    user: { id: user.id, company_id: decoded.company_id || user.company_id },
    tokens: { access: newAccess, refresh: newRefresh },
    options: {
      access: { httpOnly: true, sameSite: 'strict', secure: env.NODE_ENV === 'production', maxAge: accessMax },
      refresh: { httpOnly: true, sameSite: 'strict', secure: env.NODE_ENV === 'production', maxAge: refreshMax },
      isLoggedIn: { sameSite: 'strict', secure: env.NODE_ENV === 'production', maxAge: refreshMax }
    }
  };
};

/**
 * Core authentication flow shared by protect middleware.
 * Validates access token, checks user status, attempts refresh if needed.
 * @param {Object} params
 * @param {string|null} params.accessToken
 * @param {string|null} params.refreshToken
 * @param {Function} params.handleRefreshToken - (refreshToken) => result
 * @returns {{ error: Object|null, user: Object|null, refreshResult: Object|null }}
 */
const authenticateRequest = async ({ accessToken, refreshToken, handleRefreshToken }) => {
  if (!accessToken && !refreshToken) {
    return { error: { status: 401, message: 'No token found', requiresLogin: true } };
  }

  const decoded = validateAccessToken(accessToken);
  if (decoded) {
    const isApproved = await checkUserActive(decoded.id);
    if (!isApproved) {
      return { error: { status: 401, message: 'User is not approved', requiresLogin: true } };
    }
    return { user: { id: decoded.id, company_id: decoded.company_id } };
  }

  if (!refreshToken) {
    return { error: { status: 401, message: 'Session expired', requiresLogin: true } };
  }

  const result = await handleRefreshToken(refreshToken);
  const isApproved = await checkUserActive(result.user.id);
  if (!isApproved) {
    return { error: { status: 401, message: 'User is not approved', requiresLogin: true } };
  }
  return { user: result.user, refreshResult: result };
};

module.exports = {
  setAuthCookies,
  checkUserActive,
  validateAccessToken,
  performTokenRefresh,
  rotateTokens,
  authenticateRequest
};
