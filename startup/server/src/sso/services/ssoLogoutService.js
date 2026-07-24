'use strict';

const logger = require('../../../logger');
const userService = require('../../services/userService');


const endSessionForWalletAccount = async (claims) => {
  const sub = claims.sub;
  if (!sub) {
    logger.warn(`[oidc-rp] Backchannel logout with no sub, nothing to end: sid=${claims.sid}`);
    return false;
  }

  const user = await userService.getUserByWalletUserId(sub);
  if (!user) {
    logger.info(`[oidc-rp] Backchannel logout for unknown sub: ${sub}`);
    return false;
  }

  await userService.invalidateSessions(user.id);

  logger.info(`[oidc-rp] Backchannel logout ended session for user: ${user.id}`);
  return true;
};

module.exports = {
  endSessionForWalletAccount
};
