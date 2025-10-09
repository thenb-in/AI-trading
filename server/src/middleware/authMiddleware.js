const { User } = require('../models');
const logger = require('../../logger');
const { verifyToken, generateAccessToken, generateRefreshToken } = require('../utils/startup/authUtils');
const env = require('../config/env');
const allowedPermissions = require('../utils/startup/allowedPermissions');

const refreshTokenLocks = new Map();

const setAuthCookies = (res, tokens, options) => {
  res.cookie('accessToken', tokens.access, options.access);
  res.cookie('refreshToken', tokens.refresh, options.refresh);
  res.cookie('isLoggedIn', 'true', options.isLoggedIn);
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
  const decoded = verifyToken(refreshToken, env.REFRESH_TOKEN_SECRET);
  const userId = decoded.id;

  if (refreshTokenLocks.has(userId)){
    return refreshTokenLocks.get(userId);
  }

  const refreshPromise = (async () => {
    const tx = await User.sequelize.transaction();
    try {
      const user = await User.findByPk(userId, {
        attributes: ['id', 'isActive', 'refresh_token', 'companyId'],
        lock: tx.LOCK.UPDATE, transaction: tx
      });
      if (!user || user.refresh_token !== refreshToken || !user.isActive){
        throw new Error('Invalid or inactive user');

      }

      const newAccess = generateAccessToken(user);
      const newRefresh = await generateRefreshToken(user);
      user.refresh_token = newRefresh;
      user.last_active = new Date();
      await user.save({ transaction: tx });
      await tx.commit();

      const accessMax = parseInt(env.MAX_JWT_ACCESS_EXPIRATION_MS || 300000);
      const refreshMax = parseInt(env.MAX_JWT_REFRESH_EXPIRATION_MS || 604800000);
      return {
        user: { id: user.id, company_id: user.companyId },
        tokens: { access: newAccess, refresh: newRefresh },
        options: {
          access: { httpOnly: true, sameSite: 'strict', secure: env.NODE_ENV === 'production', maxAge: accessMax },
          refresh: { httpOnly: true, sameSite: 'strict', secure: env.NODE_ENV === 'production', maxAge: refreshMax },
          isLoggedIn: { sameSite: 'strict', secure: env.NODE_ENV === 'production', maxAge: refreshMax }
        }
      };
    } catch (e) {
      if (!tx.finished){
        await tx.rollback();
      }
      throw e;
    }
  })();

  refreshTokenLocks.set(userId, refreshPromise);
  const result = await refreshPromise.finally(() => refreshTokenLocks.delete(userId));
  return result;
};

exports.protect = async (req, res, next) => {
  try {
    const { accessToken, refreshToken } = req.cookies || {};
    if (!accessToken && !refreshToken){
      return res.status(401).json({ message: 'No token found', requiresLogin: true });
    }

    const decoded = validateAccessToken(accessToken);
    if (decoded) {
      req.user = { id: decoded.id, company_id: decoded.company_id };
      return next();
    }

    if (!refreshToken){
      return res.status(401).json({ message: 'Session expired', requiresLogin: true });
    }


    try {
      const result = await handleRefreshToken(refreshToken);
      req.user = result.user;
      setAuthCookies(res, result.tokens, result.options);
      logger.info(`Tokens refreshed for user ${result.user.id}`);
      return next();
    } catch (err) {
      logger.warn(`Refresh token failed: ${err.message}`);
      return res.status(401).json({ message: 'Your session has expired. Please refresh the page or log in again to continue.', requiresLogin: true });
    }
  } catch (error) {
    logger.error(`Auth middleware error: ${error.message}`);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.admin = (req, res, next) => {
  const hasPermission = allowedPermissions(req.user.id, ['Admin']);
  if (!hasPermission){
    return res.status(403).json({ error: 'You are not authorized to access this resource Admin' });
  }
  next();
};
