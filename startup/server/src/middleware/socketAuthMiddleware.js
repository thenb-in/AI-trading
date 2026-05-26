// JWT-based handshake middleware for incoming socket.io connections.
const cookie = require('cookie');
const logger = require('../../logger');
const { validateAccessToken, validateRefreshToken } = require('../utils/auth_shared_utils');

function extractTokens(socket) {
  const handshake = socket.handshake || {};
  const authHeader = handshake.headers?.authorization;
  const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const refreshHeader = handshake.headers?.['x-refresh-token'] || null;

  // Raw Cookie header → object. cookie-parser does the same on HTTP routes.
  const cookies = handshake.headers?.cookie ? cookie.parse(handshake.headers.cookie) : {};

  // handshake.auth.token wins when the caller passed it explicitly (e.g.
  // the app server's outbound link to the report runner ships its service
  // token here).
  const accessToken = handshake.auth?.token || bearer || cookies.accessToken || null;
  const refreshToken = refreshHeader || cookies.refreshToken || null;

  return { accessToken, refreshToken };
}

// Returns a socket.io middleware fn. Pass { allowAnonymous: true } only for
// internal/dev sockets that should not require auth — the report runner and
// app server links should never set this.
function buildSocketAuthMiddleware(opts = {}) {
  const { allowAnonymous = false } = opts;
  return async (socket, next) => {
    const { accessToken, refreshToken } = extractTokens(socket);

    if (!accessToken && !refreshToken) {
      if (allowAnonymous) {
        socket.user = null;
        return next();
      }
      logger.warn(`[socket-auth] reject ${socket.id}: no token`);
      return next(new Error(`UNAUTHENTICATED reject ${socket.id}: no token`));
    }

    // Happy path: the access token is still valid.
    const decoded = accessToken ? validateAccessToken(accessToken) : null;
    if (decoded) {
      socket.user = { id: decoded.id, company_id: decoded.company_id, ...decoded };
      socket.accessToken = accessToken;
      return next();
    }

    // Access token missing or expired — mirror the HTTP middleware's
    // graceful fallback to the refresh token. We can't ROTATE tokens here
    // because there's no response to set cookies on; we just validate the
    // refresh token to keep the long-lived session alive on the socket.
    // The next HTTP request will rotate access/refresh cookies normally.
    if (refreshToken) {
      try {
        const refreshDecoded = await validateRefreshToken(refreshToken);
        if (refreshDecoded?.id) {
          socket.user = {
            id: refreshDecoded.id,
            company_id: refreshDecoded.company_id,
            ...refreshDecoded
          };
          return next();
        }
      } catch (err) {
        logger.warn(`[socket-auth] refresh-token check failed for ${socket.id}: ${err.message}`);
      }
    }

    logger.warn(`[socket-auth] reject ${socket.id}: invalid token (access expired, refresh missing or invalid)`);
    return next(new Error(`INVALID_TOKEN reject ${socket.id}: invalid token (access expired, refresh missing or invalid`));
  };
}

module.exports = { buildSocketAuthMiddleware };
