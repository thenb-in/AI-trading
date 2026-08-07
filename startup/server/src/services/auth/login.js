const bcrypt = require('bcrypt');
const { fn, col, where } = require('sequelize');
const logger = require('../../../logger');
const { User, UserProfile } = require('../../models');
const {
  generateAccessToken,
  generateRefreshToken
} = require('../../utils/authUtils');
const { findModelById, getUserWithRoleInclude } = require('../../utils/modelHelpers');
const { verifyValidSubscribedPermission } = require('../../utils/subscriptionPermissionUtils');
const { notifyCompanyAdminsOfLogin } = require('../../notifications/dispatchers');
const companyService = require('../companyService');
const userService = require('../userService');
const { isSsoManagedAccount } = require('../../config/ssoUserAccess');

const normalize = (val) => val?.trim().toLowerCase();

const findUserWithRole = async (username) => {
  const normalizedUsername = normalize(username);
  return await User.findOne({
    where: where(fn('LOWER', col('username')), normalizedUsername),
    include: getUserWithRoleInclude(),
    attributes: { exclude: ['refresh_token'] }
  });
};

const findUserWithRoleById = async (userId) => {
  return findModelById(User, userId, {
    include: getUserWithRoleInclude(),
    attributes: { exclude: ['refresh_token'] }
  });
};

const validateUserStatusAndPassword = async (user, password, username) => {
  if (!user) {
    logger.warn(`Login failed: User not found: ${username}`);
    throw { status: 401, message: 'User not found' };
  }

  if (!user.password) {
    logger.warn(`Login failed: SSO-only account, no local password: ${user.id}`);
    throw { status: 403, message: 'This account signs in with SSO. Use "Login with SSO".' };
  }
  logger.info(`Verifying user password: ${user.id}`);
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    logger.warn(`Login failed: Invalid password: ${username}`);
    throw { status: 401, message: 'Invalid credentials' };
  }

  if (!user.isActive) {
    logger.warn(`Login failed: Account not found: ${user.id}`);
    throw { status: 403, message: 'Account not found' };
  }
  if (!user.is_approved) {
    logger.warn(`Login failed: Account not approved: ${user.id}`);
    throw { status: 403, message: 'Your account is pending admin approval. Please try again later.' };
  }
  // Check if this is first login (last_active is null)
  if (user.last_active === null) {
    logger.info(`First time login detected: ${user.id} - Password change required`);
    throw { status: 403, message: 'Please change your password', requiresPasswordChange: true };
  }
};

const issueTokensAndPersist = async (user) => {
  const accessToken = await generateAccessToken(user);
  const refreshToken = await generateRefreshToken(user);
  await userService.updateUserRefreshTokenAndLastActive(user.id, refreshToken);
  return { accessToken, refreshToken };
};

const buildLoginPayload = (user, activeCompany, accessToken, refreshToken, profile) => {
  const userData = user.get({ plain: true });
  delete userData.password;
  delete userData.refresh_token;

  const filteredPermissions = user.role?.permissions || [];
  return {
    user: {
      id: userData.id,
      phone: userData.phone,
      username: userData.username,
      name: userData.name,
      isActive: userData.isActive,
      mobileApp: userData.mobileApp,
      desktopWeb: userData.desktopWeb,
      mobileWeb: userData.mobileApp,
      office_latitude: profile?.office_latitude,
      office_longitude: profile?.office_longitude,
      default_screen_mode: profile?.default_screen_mode,
      company: activeCompany ? { id: activeCompany.id, name: activeCompany.name, longitude: activeCompany.longitude, latitude: activeCompany.latitude } : null,
      isSupportUser: userData.isSupportUser,
      isSso: Boolean(userData.wallet_user_id),
      ssoManaged: isSsoManagedAccount(userData),
      is_totp_enabled: userData.is_totp_enabled,
      role: userData.role ? {
        id: userData.role.id,
        name: userData.role.name,
        description: userData.role.description,
        permissions: filteredPermissions
      } : null
    },
    accessToken,
    refreshToken
  };
};

/**
 * Find the user and confirm they may sign in with this password. Split out from
 * loginUser so any caller that just needs the vetted user can reuse it.
 */
const verifyCredentials = async (username, password) => {
  const trimmedUsername = normalize(username);
  logger.info(`Looking up user by username: ${trimmedUsername}`);
  const user = await findUserWithRole(trimmedUsername);
  await validateUserStatusAndPassword(user, password, trimmedUsername);
  return user;
};

const loginUser = async (credentials, isSsoFlow = false) => {
  const { username, password } = credentials;
  logger.info(`User login attempt: ${normalize(username)} - SSO: ${isSsoFlow}`);
  const user = await verifyCredentials(username, password);
  logger.info(`User login successful: ${user.id}`);
  const { accessToken, refreshToken } = await issueTokensAndPersist(user);
  const activeCompany = await companyService.getActiveCompanyForUser(user);

  await notifyCompanyAdminsOfLogin({
    companyId: user.company_id,
    actor: { id: user.id, name: user.name }
  });
  // Filter permissions based on subscription status
  const userWithFilteredPermissions = await verifyValidSubscribedPermission(user, activeCompany.id);
  const profile = await UserProfile.findOne({ where: { userId: user.id } });
  return buildLoginPayload(userWithFilteredPermissions, activeCompany, accessToken, refreshToken, profile);
};

module.exports = {
  findUserWithRole,
  findUserWithRoleById,
  issueTokensAndPersist,
  buildLoginPayload,
  verifyCredentials,
  loginUser
};
