'use strict';

const logger = require('../../../logger');
const { findByWalletAccountId, linkWalletAccount } = require('../../services/identityLinkService');
const { provisionUserFromSignup } = require('./ssoProvisionService');
const {
  findUserWithRole,
  findUserWithRoleById,
  issueTokensAndPersist,
  buildLoginPayload,
  revokeApprovalAfterReset
} = require('../../services/authService');
const { getProfileByUserId } = require('../../services/userProfileService');
const companyService = require('../../services/companyService');
const { verifyValidSubscribedPermission } = require('../../utils/subscriptionPermissionUtils');
const { notifyCompanyAdminsOfLogin } = require('../../notifications/dispatchers');

async function validateUserForSso(user) {
  if (!user) {
    throw { status: 403, message: 'No local account linked. Ask an admin to invite you.' };
  }
  if (!user.isActive) {
    throw { status: 403, message: 'Account  not found' };
  }
  if (!user.is_approved) {
    throw { status: 403, message: 'Your account is pending admin approval. Please try again later.' };
  }
}



async function resolveOrProvisionUser(claims, { companyId = null } = {}) {
  const sub = claims.sub;
  if (!sub) {
    throw { status: 401, message: 'OIDC subject missing' };
  }

  //for signup
  if (companyId) {
    return provisionUserFromSignup({ claims, companyId });
  }

  const link = await findByWalletAccountId(sub);
  if (link) {
    const user = await findUserWithRoleById(link.user_id);
    await validateUserForSso(user);
    return user;
  }

  const username = claims.preferred_username?.trim();
  if (!username) {
    throw {
      status: 403,
      message: 'Account not found on wallet server'
    };
  }

  const user = await findUserWithRole(username);
  await validateUserForSso(user);

  await linkWalletAccount({
    walletAccountId: sub,
    userId: user.id,
    companyId: user.company_id
  });
  logger.info(`[oidc-rp] First-login linked sub=${sub} user=${user.id} username=${username}`);
  return user;
}


async function completeSsoLogin(user) {
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
}


async function completeSsoRoundTrip(claims, { companyId = null, resetPassword = false } = {}) {
  const user = await resolveOrProvisionUser(claims, { companyId });

  if (resetPassword) {
    await revokeApprovalAfterReset(user.id);
    return { pendingApproval: true, pendingReason: 'reset', username: user.username };
  }

  if (!user.is_approved) {
    return { pendingApproval: true, username: user.username };
  }

  const payload = await completeSsoLogin(user);
  return { pendingApproval: false, ...payload };
}

module.exports = {
  completeSsoRoundTrip
};
