const userService = require('@services/startup/userService');
const jwt = require('jsonwebtoken');
const logger = require('../../logger');
const env = require('../config/env');
const db = require('../models');
const allowedPermissions = require('../utils/startup/allowedPermissions');
const { verifyToken, generateAccessToken, generateRefreshToken } = require('../utils/startup/authUtils');

const refreshTokenLocks = new Map();

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

const handleRefreshToken = async (refreshToken) => {
  // verify refresh token first
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

  // Use the userId as the lock key so callers for the same user collide.
  const tokenKey = decoded.id;

  // If a refresh for THIS exact user is already running, reuse its promise.
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
      const oldRefreshExpiry = decoded.exp ? new Date(decoded.exp * 1000).toISOString() : 'unknown';
      logger.debug(`Cid:${decoded.company_id} - Rotating tokens for user ${user.id}; old refresh token expired at ${oldRefreshExpiry}`);

      const newAccess = await generateAccessToken({ id: user.id, company_id: decoded.company_id });
      const newRefresh = await generateRefreshToken({ id: user.id, company_id: decoded.company_id });
      await userService.updateUserRefreshToken(user.id, newRefresh, tx);
      await tx.commit();

      const newAccessDecoded = jwt.decode(newAccess);
      const newRefreshDecoded = jwt.decode(newRefresh);
      const newAccessExpiry = newAccessDecoded?.exp ? new Date(newAccessDecoded.exp * 1000).toISOString() : 'unknown';
      const newRefreshExpiry = newRefreshDecoded?.exp ? new Date(newRefreshDecoded.exp * 1000).toISOString() : 'unknown';

      const accessMax = env.MAX_JWT_ACCESS_EXPIRATION_MS;
      const refreshMax = env.MAX_JWT_REFRESH_EXPIRATION_MS;
      logger.debug(`Cid:${decoded.company_id} - Refreshed tokens for user ${user.id}; new access expires at ${newAccessExpiry}, new refresh expires at ${newRefreshExpiry}`);

      const result = {
        user: { id: user.id, company_id: decoded.company_id || user.company_id },
        tokens: { access: newAccess, refresh: newRefresh },
        options: {
          access:  { httpOnly: true, sameSite: 'strict', secure: env.NODE_ENV === 'production', maxAge: accessMax },
          refresh: { httpOnly: true, sameSite: 'strict', secure: env.NODE_ENV === 'production', maxAge: refreshMax },
          isLoggedIn: { sameSite: 'strict', secure: env.NODE_ENV === 'production', maxAge: refreshMax }
        },
        isRefresher: true // flag to indicate this response is from a refresh operation
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
      }, 5000); // 5s grace period — tune as needed
    }
  })();

  // return the deferred promise so callers will await the resolution
  return deferredPromise;
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
      // Make the new access token available on req so downstream middleware/handlers
      // can use it directly without waiting for the next request cycle.
      req.cookies.accessToken = result.tokens.access;
      if (result.isRefresher) {
        setAuthCookies(res, result.tokens, result.options);
        // Also expose new tokens in headers for mobile clients
        // (React Native cannot read httpOnly Set-Cookie headers)
        res.set('x-new-access-token', result.tokens.access);
        res.set('x-new-refresh-token', result.tokens.refresh);
        logger.info(`Tokens refreshed for user ${result.user.id}`);
      }

      return next();
    } catch (err) {
      logger.error('Refresh token failed', err);
      return res.status(400).json({ message: 'Your session has expired. Please refresh the page or log in again to continue.', requiresLogin: false });
    }
  } catch (error) {
    logger.error('Auth middleware error', error);
    res.status(500).json({ message: `Internal server error ${error.message}` });
  }
};

exports.admin = async (req, res, next) => {
  const hasPermission = await allowedPermissions(req.user.id, ['Admin']);
  if (!hasPermission) {
    return res.status(403).json({ error: `You are not authorized to access this resource Admin ${req.user.id}` });
  }
  next();
};
