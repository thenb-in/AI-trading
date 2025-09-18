const jwt = require('jsonwebtoken');
const { User, Company, Role, Permission } = require('../models');
const logger = require('../logger');
const {
  verifyToken,
  generateAccessToken,
  revokeRefreshToken ,
  generateRefreshToken
} = require('../utils/authUtils');
const env = require('../config/env');

// In-memory cache to store promises of ongoing refresh token operations
const refreshTokenPromises = new Map();

// Cache to prevent concurrent refresh token operations


// Middleware to verify and refresh access tokens
exports.protect = async (req, res, next) => {
  try {
    // Validate required environment variables
    if (!env.JWT_SECRET || !env.REFRESH_TOKEN_SECRET) {
      logger.error('Missing required JWT secrets in environment variables');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    if (!env.MAX_JWT_ACCESS_EXPIRATION_MS || !env.MAX_JWT_REFRESH_EXPIRATION_MS) {
      logger.warn('Missing JWT expiration times in environment variables, using defaults');
    }

    const { accessToken, refreshToken } = req.cookies || {};
    logger.debug(`Cookies received: ${JSON.stringify({
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      accessTokenLength: accessToken?.length,
      refreshTokenLength: refreshToken?.length
    })}`);
    // 1. Try access token first
    if (accessToken) {
      try {
        const decoded = verifyToken(accessToken, env.JWT_SECRET);
        const user = await User.findByPk(decoded.id, {
          attributes: ['id', 'phone', 'name', 'companyId', 'isActive', 'is_approved', 'refresh_token']
        });

        if (!user) {
          logger.warn('User not found during token verification');
          return res.status(401).json({ message: 'User not found', requiresLogin: true });
        }

        if (!user.is_approved) {
          logger.warn(`Login attempt by inactive user: ${user.id}`);
          res.clearCookie('accessToken');
          res.clearCookie('refreshToken');
          res.clearCookie('isLoggedIn');
          return res.status(401).json({ message: 'Your account has been deactivated', requiresLogin: true });
        }

        // Attach user to request
        req.user = {
          id: user.id,
          phone: user.phone,
          name: user.name,
          role: user.role,
          companyId: user.companyId,
          isActive: user.isActive,
          roleId: user.roleId
        };
        return next();
      } catch (error) {
        logger.error(`Access token verification failed, proceeding to refresh: ${error.message}`);
      }
    }

    // 2. Try refresh token only if access token is missing or expired
    if (refreshToken) {
      let decodedRefresh;
      try {
        decodedRefresh = verifyToken(refreshToken, env.REFRESH_TOKEN_SECRET);
      } catch (err) {
        logger.error(`Refresh token verification failed: ${err.message}`);
        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');
        res.clearCookie('isLoggedIn');
        return res.status(401).json({ message: 'Invalid refresh token. Please log in again.', requiresLogin: true });
      }

      const { id: userId } = decodedRefresh;

      // --- ATOMIC LOCKING MECHANISM ---
      if (refreshTokenPromises.has(userId)) {
        try {
          const { user, newTokens } = await refreshTokenPromises.get(userId);
          req.user = user;
          res.cookie('accessToken', newTokens.accessToken, newTokens.cookieOptions.access);
          res.cookie('refreshToken', newTokens.refreshToken, newTokens.cookieOptions.refresh);
          res.cookie('isLoggedIn', 'true', newTokens.cookieOptions.isLoggedIn);
          return next();
        } catch (error) {
          return res.status(401).json({ message: 'Your session has expired. Please refresh the page or log in again to continue.', requiresLogin: true });
        }
      }

      const refreshPromise = (async () => {
        const transaction = await User.sequelize.transaction();
        try {
          const user = await User.findByPk(userId, { attributes: ['id', 'phone', 'name', 'companyId', 'isActive', 'refresh_token', 'roleId', 'role'], lock: transaction.LOCK.UPDATE, transaction });
          if (!user || user.refresh_token !== refreshToken) {
            await transaction.rollback();
            logger.warn(`Invalid refresh token or user not found: ${userId}`);
            throw new Error('Invalid refresh token or user not found');
          }
          if (!user.isActive) {
            await transaction.rollback();
            logger.warn(`Login attempt by inactive user during token refresh: ${userId}`);
            res.clearCookie('accessToken');
            res.clearCookie('refreshToken');
            res.clearCookie('isLoggedIn');
            throw new Error('Your account has been deactivated');
          }

          const newAccessToken = generateAccessToken(user);
          const newRefreshToken = await generateRefreshToken(user);
          user.last_active = new Date();
          user.refresh_token = newRefreshToken;
          await user.save({ transaction });
          await transaction.commit();

          const attachedUser = { id: user.id, phone: user.phone, name: user.name, role: user.role, companyId: user.companyId, isActive: user.isActive, roleId: user.roleId };
          const accessTokenMaxAge = parseInt(process.env.MAX_JWT_ACCESS_EXPIRATION_MS, 10) || 300000;
          const refreshTokenMaxAge = parseInt(process.env.MAX_JWT_REFRESH_EXPIRATION_MS, 10) || 604800000;

          return {
            user: attachedUser,
            newTokens: {
              accessToken: newAccessToken,
              refreshToken: newRefreshToken,
              cookieOptions: {
                access: { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: accessTokenMaxAge },
                refresh: { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: refreshTokenMaxAge },
                isLoggedIn: { secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: refreshTokenMaxAge }
              }
            }
          };
        } catch (error) {
          if (transaction && !transaction.finished) {
            await transaction.rollback();
          }
          throw error;
        }
      })();

      refreshTokenPromises.set(userId, refreshPromise);

      try {
        const { user, newTokens } = await refreshPromise;
        req.user = user;
        res.cookie('accessToken', newTokens.accessToken, newTokens.cookieOptions.access);
        res.cookie('refreshToken', newTokens.refreshToken, newTokens.cookieOptions.refresh);
        res.cookie('isLoggedIn', 'true', newTokens.cookieOptions.isLoggedIn);
        logger.info(`Successfully refreshed tokens: ${userId}`);
        return next();
      } catch (err) {
        logger.error(`Token refresh failed: ${userId} - ${err.message}`);

        return res.status(401).json({ message: 'Your session has expired. Please refresh the page or log in again to continue.', requiresLogin: true });
      } finally {
        refreshTokenPromises.delete(userId);
      }
    }

    // 3. If no tokens are found at all
    logger.warn('No tokens found in request, user is not authorized.');
    res.status(401).json({ message: 'Not authorized, no token', requiresLogin: true });

  } catch (error) {
    logger.error(`An unexpected error occurred in auth middleware: ${error.message} - Stack: ${error.stack}`);
    res.status(500).json({ message: 'An internal server error occurred.' });
  }
};

exports.admin = (req, res, next) => {
  // todo: find the permission
  const requiredPermission = 'Admin';
  const hasPermission = allowedPermissions(req.user.id, [requiredPermission]);
  if (!hasPermission) {
    return res.status(403).json({ error: 'You are not authorized to access this resource ' + requiredPermission });
  }
  next();
};
