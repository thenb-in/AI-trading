const bcrypt = require('bcrypt');
const { where: _where } = require('sequelize');
const logger = require('../../../logger');
// User is the primary model for this service
const { User } = require('../../models');
const {
  generateAccessToken,
  generateRefreshToken,
  revokeRefreshToken
} = require('../../utils/startup/authUtils');
const { findModelByIdOrThrow } = require('../../utils/startup/modelHelpers');
const companyService = require('./companyService');
const rolePermissionService = require('./rolePermissionService');
const { getUserWithRoleInclude } = require('./rolePermissionService');
const totpService = require('./totpService');
const userService = require('./userService');

/**
 * Registers a new user account. Reactivates an existing inactive user if found.
 * @param {string} username - Unique login identifier
 * @param {string} password - Plain-text password (will be hashed with bcrypt)
 * @param {string|null} company_id - Optional company to link the user to
 * @param {Object} userData - Additional user fields
 * @param {string} userData.phone - Contact phone number
 * @param {string} userData.name - Display name
 * @param {string|null} userData.role - Role ID to assign
 * @param {Object|null} transaction - Sequelize transaction instance
 * @returns {Promise<Object>} Created or reactivated User model instance
 * @throws {Error} If username already exists and is active, or company_id is invalid
 */
const signup = async (username, password, company_id, { phone, name, role }, transaction) => {
  logger.info(`Signup attempt: ${phone} - ${name} - ${role}`);

  const existingUser = await User.findOne({ where: { username } });
  logger.info(`Checking if user already exists: ${username} - Found: ${!!existingUser}`);

  if (existingUser) {
    // Check if user is inactive
    if (!existingUser.isActive) {
      // Update inactive user to active and set is_approved to false
      await existingUser.update({
        isActive: true,
        is_approved: false
      });
      logger.info(`Reactivated existing user: ${phone}`);
      return existingUser;
    } else {
      // User is already active, throw error
      throw new Error(`UserName already exists ${username}.`);
    }
  }

  // When company_id is provided (e.g. from signup link), validate company exists
  if (company_id) {
    const company = await companyService.existingCompany(company_id, transaction);
    if (!company) {
      logger.warn(`Signup with invalid company_id: ${company_id}`);
      throw new Error(`Company not found ${company_id}`);
    }
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await User.create({
    phone,
    username,
    password: hashedPassword,
    name,
    company_id: company_id?company_id:null,
    role_id: role ?role : null,
    isActive: true,
    refresh_token: null,
    mobileApp: false,
    desktopWeb: true,
    mobileWeb:  false,
    is_approved:false
  }, { transaction });
  // Use userService and multiCompanyService for related operations
  // Only create profile and assign to company if companyId is provided
    // Create user profile without company
  await userService.createUserProfile(user?.dataValues?.id, { currentCompany: company_id?company_id:null }, transaction);
  return user;
};

/**
 * Looks up a user by username with their role and permissions eagerly loaded.
 * @param {string} username - Username to search for (trimmed)
 * @returns {Promise<Object|null>} User instance with role/permissions included, or null
 */
const findUserWithRole = async (username) => {
  username = username?.trim();
  return await User.findOne({
    where: { username },
    include: getUserWithRoleInclude(),
    attributes: { exclude: ['refresh_token'] }
  });
};

/**
 * Validates user existence, password correctness, active status, approval, and first-login state.
 * @param {Object|null} user - User model instance (may be null if not found)
 * @param {string} password - Plain-text password to verify against bcrypt hash
 * @param {string} username - Username for logging purposes
 * @returns {Promise<void>}
 * @throws {{ status: number, message: string }} On invalid credentials, inactive, unapproved, or first-login
 */
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

/**
 * Generates new access and refresh JWT tokens for a user and persists the refresh token in the database.
 * @param {Object} user - User model instance with id and company_id
 * @returns {Promise<{ accessToken: string, refreshToken: string }>} Newly generated tokens
 * @side_effects Updates user's refresh_token and last_active in the database
 */
const issueTokensAndPersist = async (user) => {
  const accessToken = generateAccessToken(user);
  logger.info(`Access token generated: ${accessToken}`);
  const refreshToken = await generateRefreshToken(user);
  logger.info(`Refresh token generated: ${refreshToken}`);
  await userService.updateUserRefreshTokenAndLastActive(user.id, refreshToken);
  return { accessToken, refreshToken };
};

/**
 * Resolves the user's active company by checking their profile first, falling back to user.company_id.
 * @param {Object} user - User model instance
 * @returns {Promise<{ id: string, name: string }|null>} Active company info or null if none
 */
const getActiveCompanyForUser = async (user) => {
  // Use userService for UserProfile and companyService for Company
  const profile = await userService.getUserProfile(user.id);
  const activeCompanyId = profile?.currentCompany || user.company_id;
  if (!activeCompanyId) {
    return null;
  }
  const company = await companyService.getCompanySettings(activeCompanyId);
  return { id: company.id, name: company.name };
};

/**
 * Constructs the login response payload with user data, company info, tokens, and onboarding flag.
 * @param {Object} user - Sequelize User instance (sensitive fields are stripped)
 * @param {{ id: string, name: string }|null} activeCompany - Resolved active company
 * @param {string} accessToken - JWT access token
 * @param {string} refreshToken - JWT refresh token
 * @returns {Object} Login response payload with user, requiresOnboarding, accessToken, refreshToken
 */
const buildLoginPayload = (user, activeCompany, accessToken, refreshToken) => {
  const userData = user.get({ plain: true });
  delete userData.password;
  delete userData.refresh_token;
  const requiresOnboarding = !activeCompany || !activeCompany.id;
  return {
    user: {
      id: userData.id,
      phone: userData.phone,
      username: userData.username,
      name: userData.name,
      isActive: userData.isActive,
      is_totp_enabled: userData.is_totp_enabled,
      company: activeCompany ? { id: activeCompany.id, name: activeCompany.name } : null,
      isSadmin: userData.isSadmin,
      role: userData.role ? {
        id: userData.role.id,
        name: userData.role.name,
        description: userData.role.description,
        permissions: userData.role.permissions || []
      } : null
    },
    requiresOnboarding,
    accessToken,
    refreshToken
  };
};

/**
 * Orchestrates the full login flow: find user, validate credentials, issue tokens, resolve company.
 * @param {Object} credentials - Login credentials
 * @param {string} credentials.username - Username
 * @param {string} credentials.password - Plain-text password
 * @returns {Promise<Object>} Login payload with user data, tokens, and onboarding flag
 * @throws {Object} Status/message object on auth failure
 */
const loginUser = async (credentials) => {
  const { username, password } = credentials;
  const trimmedUsername = username?.trim();
  const trimmedPassword = password?.trim();
  logger.info(`User login attempt: ${trimmedUsername}`);
  logger.info(`Looking up user by username: ${trimmedUsername}`);
  const user = await findUserWithRole(trimmedUsername);
  await validateUserStatusAndPassword(user, trimmedPassword, trimmedUsername);
  logger.info(`User login successful: ${user.id}`);
  const { accessToken, refreshToken } = await issueTokensAndPersist(user);
  const activeCompany = await getActiveCompanyForUser(user);
  return buildLoginPayload(user, activeCompany, accessToken, refreshToken);
};


/**
 * Approves a pending user account, optionally assigning a role and controlling password reset requirement.
 * @param {string|number} userId - ID of the user to approve
 * @param {boolean} requirePasswordReset - If true, keeps last_active null to force password change on first login
 * @param {string|number|null} roleId - Optional role to assign during approval
 * @returns {Promise<void>}
 * @throws {Error} If user or role not found
 * @side_effects Saves user with is_approved=true, optionally sets role_id and last_active
 */
const approveUser = async (userId, requirePasswordReset = false, roleId = null) => {
  const user = await findModelByIdOrThrow(User, userId, {}, 'User');

  user.is_approved = true;

  // If roleId is provided, validate and assign it - use adminService
  if (roleId) {
    const allRoles = await rolePermissionService.getRolesAndPermissions(user.company_id);
    const roleExists = allRoles.some(r => r.id === roleId);
    if (!roleExists) {
      throw new Error(`Role not found ${roleId}.`);
    }
    user.role_id = roleId;
    logger.info(`User approved with role assignment: ${userId} - Role: ${roleId}`);
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

/**
 * Resets a user's password. Behavior varies based on context:
 * - First login: password changed, user auto-approved, last_active set
 * - With valid OTP: password changed, user auto-approved
 * - Without OTP: password changed, user set to pending approval
 * @param {Object} data - Reset parameters
 * @param {string} data.username - Username of the account
 * @param {string} data.password - New plain-text password (will be hashed)
 * @param {boolean} data.isFirstLogin - Whether this is a first-login forced reset
 * @param {string|null} data.otp - Optional TOTP code for immediate approval
 * @returns {Promise<Object>} Updated User model instance
 * @throws {Error} If user not found or OTP is invalid
 * @side_effects Revokes all existing refresh tokens, updates password hash
 */
const resetPassword = async ({ username, password, isFirstLogin, otp }) => {
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
  } else if (otp && otp.trim()) { // If OTP is provided and valid, allow password reset without admin approval
    try {
      await totpService.verifyTotpOnly(username, otp.trim());
      user.is_approved = true;
      user.last_active = new Date();
      logger.info(`Password reset with valid OTP: ${user.id} - User approved immediately`);
    } catch (error) {
      // If OTP verification fails, require admin approval
      logger.warn(`Invalid OTP for password reset: ${user.id} - ${error.message}`);
      throw new Error(`Invalid OTP for password reset: ${user.id} - ${error.message}`);
    }
  } else { // If no OTP provided, require admin approval (existing behavior)
    logger.info(`Password reset without OTP: ${user.id} - Requires admin approval`);
    user.is_approved = false;
  }

  // Revoke all active refresh tokens
  await revokeRefreshToken(user.id);
  await user.save();
  return user;
};

/**
 * Fetches the current user's full profile including role, permissions, and active company.
 * Used by the /users/me endpoint and permission checking utilities.
 * @param {string|number} userId - User ID to look up
 * @returns {Promise<Object>} User profile object with role, permissions, and company info
 * @throws {Error} If user not found, deactivated, or token is invalid
 */
const getCurrentUser = async (userId) => {
  try {
    // Fetch user with associated company
    const user = await findModelByIdOrThrow(User, userId, {
      include: getUserWithRoleInclude()
    }, 'User');

    if (!user.isActive) {
      throw new Error(`User account is deactivated ${userId}.`);
    }

    // Use userService for UserProfile and companyService for Company
    const profile = await userService.getUserProfile(userId);
    const activeCompanyId = profile?.currentCompany || user.company_id;
    let activeCompany = null;
    if (activeCompanyId) {
      const company = await companyService.getCompanySettings(activeCompanyId);
      activeCompany = { id: company.id, name: company.name };
    }

    return {
      id: user.id,
      mobileApp: user.mobileApp,
      desktopWeb: user.desktopWeb,
      mobileWeb: user.mobileWeb,
      defaultScreenMode: profile?.default_screen_mode || 'location_mode',
      username: user.username,
      phone: user.phone,
      name: user.name,
      companyId: activeCompanyId || null,
      roleId: user.role_id,
      isActive: user.isActive,
      is_approved: user.is_approved,
      company: activeCompany ? { id: activeCompany.id, name: activeCompany.name } : null,
      isSadmin: user.isSadmin,
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

/**
 * Retrieves all global roles (those without a company scope).
 * @returns {Promise<Array<{ id: number, name: string, description: string }>>} List of global roles
 */
const getAllRoles = async () => {
  // Use adminService to get all roles
  // Get roles for a specific company (or null for global)
  // Since we need all roles without company filter, we'll get them through adminService
  // Note: getRolesAndPermissions requires companyId, so we'll get global roles
  const globalRoles = await rolePermissionService.getRolesAndPermissions(null);
  return globalRoles.map(role => ({
    id: role.id,
    name: role.name,
    description: role.description
  }));
};

//  todo : remove the use rservices from here and add them in use servuce.
module.exports = {
  signup,
  loginUser,
  resetPassword,
  approveUser,
  getCurrentUser,
  getAllRoles
};
