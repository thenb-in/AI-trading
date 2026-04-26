const jwt = require('jsonwebtoken');
const logger = require('../../../../logger');
const db = require('../../../models');
const userService = require('../../../services/startup/userService');
const { generateAccessToken, generateRefreshToken } = require('../../../utils/startup/authUtils');
const { validateRefreshToken } = require('./tokenUtils');

const refreshTokenLocks = new Map();



const handleRefreshToken = async (refreshToken) => {
  const decoded = await validateRefreshToken(refreshToken);

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

      logger.debug(`Cid:${decoded.company_id} - Refreshed tokens for user ${user.id}; new access expires at ${newAccessExpiry}, new refresh expires at ${newRefreshExpiry}`);

      const result = {
        user: { id: user.id, company_id: decoded.company_id || user.company_id },
        tokens: { access: newAccess, refresh: newRefresh },
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

module.exports = {
  handleRefreshToken
};
