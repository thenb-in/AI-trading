'use strict';

const logger = require('../../../logger');
const companyService = require('../../services/companyService');
const userService = require('../../services/userService');
const {
  findUserWithRoleById,
  issueTokensAndPersist,
  buildLoginPayload
} = require('../../services/auth');
const { getProfileByUserId } = require('../../services/userProfileService');
const { verifyValidSubscribedPermission } = require('../../utils/subscriptionPermissionUtils');
const { notifyCompanyAdminsOfLogin } = require('../../notifications/dispatchers');
const { resolveCompany, provisionUser } = require('./ssoProvisionService');


const resolveOrProvisionUser = async (claims) => {
  if (!claims.sub) {
    throw { status: 401, message: 'OIDC subject missing' };
  }

  const linked = await userService.getUserByWalletUserId(claims.sub);
  if (linked) {
    return findUserWithRoleById(linked.id);
  }

  // Someone who already had an account here before they ever used SSO: same
  // username, so claim it rather than turning them away or making a duplicate.
  const username = claims.preferred_username?.trim();
  const existing = username ? await userService.getUserByUsername(username) : null;
  if (existing) {
    await existing.update({ wallet_user_id: claims.sub });
    logger.info(`[oidc-rp] Linked existing user to Wallet: ${existing.id} - Sub: ${claims.sub}`);
    return findUserWithRoleById(existing.id);
  }

  const company = await resolveCompany(claims);
  const created = await provisionUser(claims, company);
  return findUserWithRoleById(created.id);
};

const completeSsoLogin = async (user) => {
  const { accessToken, refreshToken } = await issueTokensAndPersist(user);
  const activeCompany = await companyService.getActiveCompanyForUser(user);

  await notifyCompanyAdminsOfLogin({
    companyId: user.company_id,
    actor: { id: user.id, name: user.name }
  });

  const userWithFilteredPermissions = await verifyValidSubscribedPermission(
    user,
    activeCompany.id
  );
  const profile = await getProfileByUserId(user.id);
  return buildLoginPayload(
    userWithFilteredPermissions,
    activeCompany,
    accessToken,
    refreshToken,
    profile
  );
};

/** Wallet has vouched for them — find or make the local account, then sign in. */
const completeSsoRoundTrip = async (claims) => {
  const user = await resolveOrProvisionUser(claims);
  return completeSsoLogin(user);
};

module.exports = {
  completeSsoRoundTrip
};
