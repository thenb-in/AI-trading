const logger = require('../../../logger');
const userService = require('../../services/userService');
const { isSessionRevoked } = require('../../services/auth/sessionService');


const isTokenSuperseded = async (decoded) => {
  if (!decoded?.id || !decoded?.iat) {
    return false;
  }
  // A service token (e.g. app server → report runner) stands for no DB user and no
  // device session, so logout/supersession never applies and its id is not a user UUID
  // to look up. Skip the checks that would query nbnext_users with a non-UUID id.
  if (decoded.svc) {
    return false;
  }
  // A device signed out on its own: its token dies with its session, not when it expires.
  if (decoded.sid && await isSessionRevoked(decoded.sid)) {
    logger.info(`Access token of signed-out session ${decoded.sid} rejected for user ${decoded.id}`);
    return true;
  }
  const cutoff = await userService.getTokensValidAfter(decoded.id);
  if (!cutoff) {
    return false;
  }
  const cutoffSecond = Math.floor(new Date(cutoff).getTime() / 1000);
  const superseded = decoded.iat < cutoffSecond;
  if (superseded) {
    logger.info(`Access token superseded by logout: ${decoded.id}`);
  }
  return superseded;
};

module.exports = {
  isTokenSuperseded
};
