const jwt = require('jsonwebtoken');
const logger = require('../../../logger');
const env = require('../../config/env');
const userService = require('../../services/userService');
const { verifyToken } = require('../authUtils');

const setAuthCookies = (res, tokens) => {
  const options = getCookieOptions();
  res.cookie('accessToken', tokens.access, options.access);
  res.cookie('refreshToken', tokens.refresh, options.refresh);
  res.cookie('isLoggedIn', 'true', options.isLoggedIn);
};

const validateAccessToken = (accessToken) => {
  try {
    return verifyToken(accessToken, env.JWT_SECRET);
  } catch (err) {
    logger.warn(`Access token invalid: ${err.message}`);
    return null;
  }
};

const validateRefreshToken = async(refreshToken)=>{
  try {
    return verifyToken(refreshToken, env.REFRESH_TOKEN_SECRET);
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
};


const getCookieOptions = () => {
  const accessMax = env.MAX_JWT_ACCESS_EXPIRATION_MS;
  const refreshMax = env.MAX_JWT_REFRESH_EXPIRATION_MS;
  // Lax required so cookies survive OIDC redirect (Wallet → eTime callback → SPA)
  const base = { sameSite: 'lax', secure: env.isSecureCookie };
  return {
    access: { ...base, httpOnly: true, maxAge: accessMax },
    refresh: { ...base, httpOnly: true, maxAge: refreshMax },
    isLoggedIn: { ...base, maxAge: refreshMax }
  };
};

const clearAuthCookies = (res) => {
  const options = getCookieOptions();
  const clearOpts = {
    httpOnly: true,
    sameSite: options.access.sameSite,
    secure: options.access.secure,
    path: '/'
  };
  res.clearCookie('accessToken', clearOpts);
  res.clearCookie('refreshToken', clearOpts);
  res.clearCookie('isLoggedIn', {
    sameSite: options.isLoggedIn.sameSite,
    secure: options.isLoggedIn.secure,
    path: '/'
  });
};

const extractTokens = (req)=>{
  const authHeader = req.headers.authorization;
  const usingHeaderAuth = authHeader?.startsWith('Bearer ');
  const accessToken = usingHeaderAuth
    ? authHeader.slice(7)
    : req.cookies?.accessToken;
  const refreshToken = usingHeaderAuth
    ? req.headers['x-refresh-token']
    : req.cookies?.refreshToken;

  // Log token source and values
  const tokenSource = usingHeaderAuth ? 'header' : 'cookies';
  logger.debug(`[Auth] Token source: ${tokenSource}`);
  logger.debug(`[Auth] Access token from ${tokenSource}: ${accessToken}`);
  logger.debug(`[Auth] Refresh token from ${tokenSource}: ${refreshToken}`);

  // Log expiry times by decoding without verification
  if (accessToken) {
    const accessDecoded = jwt.decode(accessToken);
    const accessExp = accessDecoded?.exp ? new Date(accessDecoded.exp * 1000).toLocaleString() : 'unknown';
    logger.debug(`[Auth] Access token expiry: ${accessExp}`);
  }
  if (refreshToken) {
    const refreshDecoded = jwt.decode(refreshToken);
    const refreshExp = refreshDecoded?.exp ? new Date(refreshDecoded.exp * 1000).toLocaleString() : 'unknown';
    logger.debug(`[Auth] Refresh token expiry: ${refreshExp}`);
  }

  return {
    accessToken,
    refreshToken
  };
};



module.exports = {
  validateAccessToken,
  setAuthCookies,
  clearAuthCookies,
  extractTokens,
  validateRefreshToken
};
