const logger = require('../../logger');
const allowedPermissions = require('../utils/allowedPermissions');
const { handleRefreshToken, validateAccessToken, checkUserActive, setAuthCookies ,extractTokens } = require('../utils/auth_shared_utils');
const { attachDataScope } = require('../data_access/middleware');

// Mobile clients send tokens via headers (Authorization + X-Refresh-Token).
// Web clients send via cookies.

const authenticate = async (req, res, next) => {
  try {

    const {accessToken , refreshToken } = extractTokens(req);

    if (!accessToken && !refreshToken) {
      return res.status(401).json({ message: 'No token found', requiresLogin: true });
    }
    const decoded = validateAccessToken(accessToken);
    if (decoded) {
      const isApproved = await checkUserActive(decoded.id);
      if (!isApproved) {
        return res.status(401)
          .json({ message: 'Your account is currently inactive. Please reach out to your administrator for assistance.', requiresLogin: true });
      }
      req.user = { id: decoded.id, company_id: decoded.company_id };
      return next();
    }

    if (!refreshToken) {
      return res.status(401).json({ message: 'Your session has expired due to inactivity. Please sign in again to continue.', requiresLogin: true });
    }

    try {
      const result = await handleRefreshToken(refreshToken);
      const isApproved = await checkUserActive(result.user.id);
      if (!isApproved) {
        return res.status(401).json({ message: 'Your account is currently inactive. Please reach out to your administrator for assistance.' , requiresLogin: true });
      }
      req.user = result.user;
      req.cookies.accessToken = result.tokens.access;
      if (result.isRefresher) {
        setAuthCookies(res, result.tokens);
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

/**
 * Identify the login, then work out what it may see. Every protected route
 * gets both, so no route has to remember to ask for scoping.
 */
exports.protect = (req, res, next) => authenticate(req, res, () => attachDataScope(req, res, next));

exports.admin = async (req, res, next) => {
  const hasPermission = await allowedPermissions(req.user.id, ['Admin']);
  if (!hasPermission) {
    return res.status(403).json({ error: `You are not authorized to access this resource Admin ${req.user.id}` });
  }
  next();
};
