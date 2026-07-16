'use strict';

const logger = require('../../../logger');
const { findByWalletAccountId } = require('../../services/identityLinkService');
const userService = require('../../services/userService');


const endSessionForWalletAccount = async (claims) => {
  const sub = claims.sub;
  if (!sub) {
    logger.warn(`[oidc-rp] Backchannel logout with no sub, nothing to end: sid=${claims.sid}`);
    return false;
  }

  const link = await findByWalletAccountId(sub);
  if (!link) {
    logger.info(`[oidc-rp] Backchannel logout for unlinked sub: ${sub}`);
    return false;
  }

  await userService.invalidateSessions(link.user_id);

  logger.info(`[oidc-rp] Backchannel logout ended session for user: ${link.user_id}`);
  return true;
};

module.exports = {
  endSessionForWalletAccount
};
