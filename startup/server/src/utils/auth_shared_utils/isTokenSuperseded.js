const logger = require('../../../logger');
const userService = require('../../services/userService');


const isTokenSuperseded = async (decoded) => {
  if (!decoded?.id || !decoded?.iat) {
    return false;
  }
  const cutoff = await userService.getTokensValidAfter(decoded.id);
  if (!cutoff) {
    return false;
  }
  const cutoffSecond = Math.floor(new Date(cutoff).getTime() / 1000);
  const superseded = decoded.iat <= cutoffSecond;
  if (superseded) {
    logger.info(`Access token superseded by logout: ${decoded.id}`);
  }
  return superseded;
};

module.exports = {
  isTokenSuperseded
};
