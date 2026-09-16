const logger = require('../../logger');
const { handleRefreshToken, validateAccessToken, checkUserActive, isTokenSuperseded, setAuthCookies ,extractTokens } = require('../utils/auth_shared_utils');
const { isSsoUserAllowedPath } = require('../config/ssoUserAccess');
const { attachDataScope } = require('../data_access/middleware');

// Mobile clients send tokens via headers (Authorization + X-Refresh-Token).
// Web clients send via cookies.

// Managed SSO accounts (req.user.ssoManaged) may only reach the user-management
// endpoints. Everything else is 403 — the server-side mirror of the client's
// redirect. Relying-party SSO users are not managed, so they pass through.
const denySsoUserOutsideScope = (req, res, next) => {
  if (!req.user?.ssoManaged || isSsoUserAllowedPath(req.originalUrl)) {
    return next();
  }
  logger.warn(`[sso-user] ${req.user.id} blocked from ${req.method} ${req.originalUrl}`);
  return res.status(403).json({ error: 'This account can only manage users.' });
};

const authenticate = async (req, res, next) => {
  try {

    const {accessToken , refreshToken } = extractTokens(req);

    if (!accessToken && !refreshToken) {
      return res.status(401).json({ message: 'No token found', requiresLogin: true });
    }
    const decoded = validateAccessToken(accessToken);
    if (decoded) {
      const { isActive, ssoManaged } = await checkUserActive(decoded.id);
      if (!isActive) {
        return res.status(401)
          .json({ message: 'Your account is currently inactive. Please reach out to your administrator for assistance.', requiresLogin: true });
      }

      if (await isTokenSuperseded(decoded)) {
        return res.status(401)
          .json({ message: 'You have been signed out. Please sign in again to continue.', requiresLogin: true });
      }
      req.user = { id: decoded.id, company_id: decoded.company_id, ssoManaged };
      return denySsoUserOutsideScope(req, res, next);
    }

    if (!refreshToken) {
      return res.status(401).json({ message: 'Your session has expired due to inactivity. Please sign in again to continue.', requiresLogin: true });
    }

    try {
      const result = await handleRefreshToken(refreshToken);
      const { isActive, ssoManaged } = await checkUserActive(result.user.id);
      if (!isActive) {
        return res.status(401).json({ message: 'Your account is currently inactive. Please reach out to your administrator for assistance.' , requiresLogin: true });
      }
      req.user = result.user;
      req.user.ssoManaged = ssoManaged;
      req.cookies.accessToken = result.tokens.access;
      if (result.isRefresher) {
        setAuthCookies(res, result.tokens);
        res.set('x-new-access-token', result.tokens.access);
        res.set('x-new-refresh-token', result.tokens.refresh);
        logger.info(`Tokens refreshed for user ${result.user.id}`);
      }
      return denySsoUserOutsideScope(req, res, next);
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
