const bcrypt = require('bcrypt');
const { User, Company, CompanyProfile, Role, MultiCompanyModule, UserProfile } = require('../models');
const logger = require('../../logger');
const { fn, col, where } = require('sequelize');
const {
  generateAccessToken,
  generateRefreshToken,
  revokeRefreshToken
} = require('../utils/authUtils');
const { findModelByIdOrThrow, getUserWithRoleInclude } = require('../utils/modelHelpers');
const companyService = require('./companyService');
const userService = require('./userService');
const { verifyValidSubscribedPermission } = require('../utils/subscriptionPermissionUtils');
const { notifyCompanyAdminsOfLogin } = require('../notifications/dispatchers');
const env = require('../config/env');
const normalize = (val) => val?.trim().toLowerCase();


const signup = async (username, password, companyId, { phone, name, role, is_approved = false, last_active = null }, emp_code, transaction) => {
  username = normalize(username);
  password = password?.trim();
  logger.info(`Signup attempt: ${phone} - ${name} - ${companyId} - ${role}`);

  const existingUser = await User.findOne({ where: { username} });
  logger.info(`Checking if user already exists: ${username} - Found: ${!!existingUser}`);

  if (existingUser) {
    if (!existingUser.isActive) {
      await existingUser.update({
        isActive: true,
        is_approved: false
      });
      logger.info(`Reactivated existing user: ${phone}`);
      return existingUser;
    }
    throw new Error(`Username "${username}" already exists`);
  }


  const company = await findModelByIdOrThrow(Company, companyId, { transaction }, 'Company');
  logger.info(`Looking up company by ID: ${companyId} - Found: true`);

  let roleInstance = null;
  if (role) {
    logger.info(`Looking up role information: ${role} - Type: ${typeof role}`);
    // Check if role is a number (ID) or string (name)
    if (typeof role === 'number' || !isNaN(role)) {
      roleInstance = await Role.findByPk(role);
      logger.info(`Role lookup by ID completed: ${role} - Found: ${!!roleInstance}`);
    } else {
      roleInstance = await Role.findOne({ where: { name: role } });
      logger.info(`Role lookup by name completed: ${role} - Found: ${!!roleInstance}`);
    }
    if (!roleInstance) {
      logger.error(`Invalid role specified: ${role}`);
      throw new Error(`Invalid role ${role}.`);
    }
  }
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await User.create({
    phone,
    username: normalize(username),
    password: hashedPassword,
    name,
    company_id: companyId,
    role_id: roleInstance ? roleInstance.id : null,
    isActive: true,
    refresh_token: null,
    is_approved,
    last_active,
    mobileApp: company.mobileApp,      // inherits from company
    desktopWeb: company.desktopWeb,    // inherits from company
    mobileWeb: company.mobileWeb      // inherits from company
  }, { transaction });
  await UserProfile.create({ userId: user?.dataValues?.id, currentCompany: companyId, emp_code }, { transaction });
  await MultiCompanyModule.create({ userId: user?.dataValues?.id, companyId }, { transaction });

  return user;
};



const findUserWithRole = async (username) => {
  const normalizedUsername = normalize(username);

  const user = await User.findOne({
    where: where(fn('LOWER', col('username')), normalizedUsername),
    include: getUserWithRoleInclude(),
    attributes: { exclude: ['refresh_token'] }
  });

  return user;
};

const validateUserStatusAndPassword = async (user, password, username) => {
  if (!user) {
    logger.warn(`Login failed: User not found: ${username}`);
    throw { status: 401, message: 'User not found' };
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
  logger.info(`Access token generated: ${accessToken}`);
  const refreshToken = await generateRefreshToken(user);
  logger.info(`Refresh token generated: ${refreshToken}`);
  await userService.updateUserRefreshTokenAndLastActive(user.id, refreshToken);
  return { accessToken, refreshToken };
};

const buildLoginPayload = (user, activeCompany, accessToken, refreshToken,profile) => {
  // Use get({ plain: true }) but then override with filtered permissions
  const userData = user.get({ plain: true });
  delete userData.password;
  delete userData.refresh_token;

  // Get filtered permissions directly from the user object (after filtering)
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
      office_latitude:profile?.office_latitude,
      office_longitude: profile?.office_longitude,
      default_screen_mode: profile?.default_screen_mode,
      company: activeCompany ? { id: activeCompany.id, name: activeCompany.name ,longitude:activeCompany.longitude,latitude:activeCompany.latitude} : null,
      isSupportUser: userData.isSupportUser,
      enableReportRunner: env.ENABLE_REPORT_RUNNER,
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

const loginUser = async (credentials) => {
  const { username, password } = credentials;
  const trimmedUsername = normalize(username);
  const trimmedPassword = password;
  logger.info(`User login attempt: ${trimmedUsername}`);
  logger.info(`Looking up user by username: ${trimmedUsername}`);
  const user = await findUserWithRole(trimmedUsername);
  await validateUserStatusAndPassword(user, trimmedPassword, trimmedUsername);
  logger.info(`User login successful: ${user.id}`);
  const { accessToken, refreshToken } = await issueTokensAndPersist(user);
  const activeCompany = await companyService.getActiveCompanyForUser(user);

  await notifyCompanyAdminsOfLogin({
    companyId: user.company_id,
    actor: { id: user.id, name: user.name }
  });
  // Filter permissions based on subscription status
  const userWithFilteredPermissions = await verifyValidSubscribedPermission(user, activeCompany.id);
  const profile = await UserProfile.findOne({ where: { userId:user.id } });
  return buildLoginPayload(userWithFilteredPermissions, activeCompany, accessToken, refreshToken,profile);
};


const approveUser = async (userId, requirePasswordReset = false, role_id = null) => {
  const user = await findModelByIdOrThrow(User, userId, {}, 'User');

  user.is_approved = true;

  // If role_id is provided, validate and assign it
  if (role_id) {
    await findModelByIdOrThrow(Role, role_id, {}, 'Role');
    user.role_id = role_id;
    logger.info(`User approved with role assignment: ${userId} - Role: ${role_id}`);
  }

  // If requirePasswordReset is false, set last_active to now so user doesn't need to reset password
  if (!requirePasswordReset) {
    user.last_active = new Date();
    logger.info(`User approved without password reset: ${userId} - Setting last_active to now`);
  } else {
    // If requirePasswordReset is true, keep last_active as null so user must reset password
    logger.info(`User approved with password reset required: ${userId} - Keeping last_active as null`);
  }

  await user.save();
};

const resetPassword = async ({ username, password, isFirstLogin }) => {
  username = username?.trim();
  password = password?.trim();
  const user = await User.findOne({ where: { username } });
  if (!user) {
    throw new Error(`User not found ${username}.`);
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  user.password = hashedPassword;
  user.is_approved = false;

  // If this is first login password reset, update last_active to now
  if (isFirstLogin === true) {
    user.last_active = new Date();
    user.is_approved = true;
    logger.info(`First login password reset: ${user.id} - Setting last_active to now`);
  }

  // Revoke all active refresh tokens
  await revokeRefreshToken(user.id);
  await user.save();
  return user;
};

const getCurrentUser = async (userId) => {
  try {
    // Fetch user with associated company
    const user = await findModelByIdOrThrow(User, userId, {
      include: getUserWithRoleInclude()
    }, 'User');

    if (!user.isActive) {
      throw new Error(`User account is deactivated ${userId}.`);
    }

    const profile = await UserProfile.findOne({ where: { userId } });
    const activeCompanyId = profile?.currentCompany || user.company_id;
    const activeCompany = activeCompanyId
      ? await Company.findByPk(activeCompanyId, {
        attributes: ['id', 'name','latitude','longitude','geofence_radius_meters'],
        include: [{ model: CompanyProfile, as: 'companyProfile', attributes: ['debug_mode_shortcut'], required: false }]
      })
      : null;

    // Filter permissions based on subscription status
    const userWithFilteredPermissions = await verifyValidSubscribedPermission(user, activeCompanyId);

    return {
      id: userWithFilteredPermissions.id,
      mobileApp: userWithFilteredPermissions.mobileApp,
      desktopWeb: userWithFilteredPermissions.desktopWeb,
      mobileWeb: userWithFilteredPermissions.mobileWeb,
      default_screen_mode: profile?.default_screen_mode || 'location_mode',
      office_latitude:profile?.office_latitude,
      office_longitude: profile?.office_longitude,
      username: userWithFilteredPermissions.username,
      phone: userWithFilteredPermissions.phone,
      name: userWithFilteredPermissions.name,
      companyId: activeCompanyId || null,
      role_id: userWithFilteredPermissions.role_id,
      isActive: userWithFilteredPermissions.isActive,
      is_approved: userWithFilteredPermissions.is_approved,
      company: activeCompany ? { id: activeCompany.id, name: activeCompany.name ,longitude:activeCompany.longitude,latitude:activeCompany.latitude, geofence_radius_meters: activeCompany.geofence_radius_meters, debug_mode_shortcut: activeCompany.companyProfile?.debug_mode_shortcut ?? null} : null,
      isSupportUser: user.isSupportUser,
      enableReportRunner: env.ENABLE_REPORT_RUNNER,
      role: user.role ? {
        id: user.role.id,
        name: user.role.name,
        description: user.role.description,
        permissions: user.role.permissions || []
      } : null
    };
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      throw new Error(`Invalid or expired token ${userId}.`);
    }
    throw new Error(`Error in getting current user ${userId} ${error.message} ${error.stack}`);
  }
};

const getAllRoles = async () => {
  const roles = await Role.findAll({
    attributes: ['id', 'name', 'description']
  });
  return roles;
};

/**
 * Live uniqueness check for a field, so a UI can tell the user a company name /
 * username is taken WHILE typing — before any create/onboard call. Uses the same
 * normalisation as persistence (username lower-cased, both trimmed) so the
 * answer matches what creation will actually see.
 */
const checkAvailability = async ({ type, value }) => {
  const raw = (value || '').trim();
  if (!raw) {
    throw { status: 400, message: 'Nothing to check' };
  }

  if (type === 'username') {
    const username = normalize(raw);
    const existing = await User.findOne({ where: { username }, attributes: ['id'] });
    return { type, value: username, available: !existing };
  }
  if (type === 'company') {
    const existing = await Company.findOne({ where: { name: raw }, attributes: ['id'] });
    return { type, value: raw, available: !existing };
  }

  throw { status: 400, message: 'Unknown field to check' };
};
//  todo : remove the use rservices from here and add them in use servuce.
module.exports = {
  signup,
  loginUser,
  resetPassword,
  approveUser,
  getCurrentUser,
  getAllRoles,
  checkAvailability
};
