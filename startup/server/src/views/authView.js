/**
 * View layer for authentication endpoints
 * Handles request parsing, validation, controller calls, and response building
 */
const logger = require('../../logger');
const env = require('../config/env');
const { MASTER_PERMISSION_CONSTANTS } = require('../constants/base_permissions');
const authController = require('../controllers/authController');
const sso = require('../sso');
const allowedPermissions = require('../utils/allowedPermissions');
const { setAuthCookies, clearAuthCookies } = require('../utils/auth_shared_utils');
const { sequelizeErrors } = require('../constants/errors');
const { SIGNUP_GENERIC_ERROR, SIGNUP_CONFLICT_MESSAGES } = require('../constants/auth');
const { OIDC_ID_TOKEN_COOKIE } = require('../constants/oidc');

/**
 * Sign up view
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
async function signup(req, res) {
  try {
    // Extract data from request
    const { phone, username, password, name, company_id, role } = req.body;

    // Call controller
    const user = await authController.signup(username, password, company_id, { phone, name, role });

    // Build and send response
    res.status(201).json({ message: `User registered successfully, awaiting admin approval for ${username}`, userId: user.id });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    // Sequelize unique/validation errors default to message = "Validation error";
    // unwrap .errors[] so the caller sees what actually failed (e.g.
    // "username must be unique") instead of the generic string.
    if (error.name === sequelizeErrors.SEQUELIZE_UNIQUE_CONSTRAINT_ERROR || error.name === sequelizeErrors.SEQUELIZE_VALIDATION_ERROR) {
      const detail = error.errors?.[0]?.message || error.message;
      logger.error('Signup error (sequelize)', error);
      const status = error.name === sequelizeErrors.SEQUELIZE_UNIQUE_CONSTRAINT_ERROR ? 409 : 400;
      return res.status(status).json({ error: detail });
    }

    const errorMessage = error.message || SIGNUP_GENERIC_ERROR;

    if (errorMessage.includes('Company not found')) {
      return res.status(404).json({ error: errorMessage });
    }
    if (errorMessage.includes('Invalid role')) {
      return res.status(400).json({ error: errorMessage });
    }
    if (SIGNUP_CONFLICT_MESSAGES.some((needle) => errorMessage.includes(needle))) {
      return res.status(409).json({ error: errorMessage });
    }

    // Log the full error for debugging
    logger.error('Signup error', error);

    // Return user-friendly error message
    res.status(500).json({ error: errorMessage });
  }
}

/**
 * Availability check view — GET /auth/availability?type=company|username&value=...
 * Public; lets a UI tell the user a name is taken while typing.
 */
async function checkAvailability(req, res) {
  try {
    const { type, value } = req.query;
    const result = await authController.checkAvailability(type, value);
    res.status(200).json(result);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    logger.error('Availability check error', error);
    res.status(500).json({ error: `Could not check availability: ${error.message}` });
  }
}

/**
 * Login view
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
async function login(req, res) {
  try {
    // Call controller
    const { user, accessToken, refreshToken } = await authController.loginUser(req.body);

    // Set HTTP-only cookies
    setAuthCookies(res, { access: accessToken, refresh: refreshToken });

    // Build and send response
    // accessToken + refreshToken are also returned in body for mobile clients
    // (React Native cannot read httpOnly Set-Cookie headers)
    res.json({ user, accessToken, refreshToken });
  } catch (error) {
    // Handle specific errors
    if (error.message === 'User not found' || error.message === 'Invalid credentials') {
      return res.status(401).json({ error: error.message });
    }
    if (error.message === 'Account not found') {
      return res.status(403).json({ error: error.message });
    }
    if (error.message === 'Account not active') {
      return res.status(403).json({ error: `Account awaiting admin approval ${error.message}` });
    }
    if (error.message === 'Your account is pending admin approval. Please try again later.') {
      return res.status(403).json({ error: error.message });
    }
    if (error.requiresPasswordChange) {
      return res.status(403).json({ error: error.message, requiresPasswordChange: true });
    }
    logger.error('Login error', error);
    res.status(500).json({ error: `Internal server error: ${error.message}` });
  }
}

/**
 * Reset password view
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
async function resetPassword(req, res) {
  try {
    // Extract data from request
    const { username, password, otp } = req.body;

    // Call controller
    await authController.resetPassword({ username, password, otp });

    // Build and send response
    res.status(200).json({ message: `Password reset successfully for ${username}` });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    logger.error('Reset password error', error);
    res.status(500).json({ error: `Internal server error: ${error.message}` });
  }
}
/**
 * Generate TOTP secret view — POST /auth/generate-totp-secret
 */
async function generateTotpSecret(req, res) {
  try {
    const { username } = req.body;
    const totpData = await authController.generateTotpSecret(username);
    res.status(200).json(totpData);
  } catch (error) {
    if (error.message.includes('User not found')) {
      return res.status(404).json({ error: error.message });
    }
    logger.error('Generate TOTP secret error', error);
    res.status(500).json({ error: `Internal server error: ${error.message}` });
  }
}

/**
 * Verify and enable TOTP view — POST /auth/verify-totp
 */
async function verifyAndEnableTotp(req, res) {
  const { username, totpCode } = req.body;
  try {
    const result = await authController.verifyAndEnableTotp(username, totpCode);
    res.status(200).json(result);
  } catch (error) {
    if (error.message.includes('User not found')) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message === `Invalid TOTP code: ${totpCode}` || error.message === `TOTP is already enabled for this user:${username}`) {
      return res.status(400).json({ error: error.message });
    }
    logger.error('Verify and enable TOTP error', error);
    res.status(500).json({ error: `Internal server error: ${error.message}` });
  }
}

/**
 * Approve user view
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
async function approveUser(req, res) {
  try {
    // Extract data from request
    const userId = req.params.userId;
    const { requirePasswordReset = false, role_id = null } = req.body;
    const currentUserId = req.user.id;

    // Permission check
    const requiredPermission = MASTER_PERMISSION_CONSTANTS.USER.approve.name;
    const hasPermission = await allowedPermissions(currentUserId, [requiredPermission]);
    if (!hasPermission) {
      return res.status(404).json({ error: `You are not authorized to access this resource ${requiredPermission}` });
    }

    // Call controller
    await authController.approveUser(userId, requirePasswordReset, role_id);

    // Build and send response
    res.status(200).json({ message: `User approved successfully ${userId}` });
  } catch (error) {
    if (error.message === 'User not found' || error.message.includes('Role not found')) {
      return res.status(404).json({ error: error.message });
    }
    logger.error('Approve user error', error);
    res.status(500).json({ error: `Internal server error: ${error.message}` });
  }
}

/**
 * Get all users view
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
async function getAllUsers(req, res) {
  try {
    // Extract data from request
    const companyId = req.user.company_id;

    // Call controller
    const users = await authController.getAllUsers(companyId);

    // Build and send response
    res.status(200).json(users);
  } catch (error) {
    logger.error('Get all users error', error);
    res.status(500).json({ error: `Internal server error: ${error.message}` });
  }
}

/**
 * Get all roles view
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
async function getAllRoles(req, res) {
  try {
    // Call controller
    const roles = await authController.getAllRoles();

    // Build and send response
    res.status(200).json(roles);
  } catch (error) {
    logger.error('Get all roles error', error);
    res.status(500).json({ error: `Internal server error: ${error.message}` });
  }
}

/**
 * Logout view
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
async function logout(req, res) {
  try {
    const userId = req.user.id;
    await authController.logout(userId);

    const idToken = req.cookies?.[OIDC_ID_TOKEN_COOKIE] || null;
    clearAuthCookies(res);
    res.clearCookie(OIDC_ID_TOKEN_COOKIE, {
      httpOnly: true,
      sameSite: 'lax',
      secure: env.isSecureCookie,
      path: '/'
    });

    const ssoLogoutUrl = await sso.buildEndSessionUrl({ idToken });

    return res.status(200).json({
      message: `User logged out successfully ${userId}`,
      ssoLogoutUrl
    });
  } catch (error) {
    logger.error('Logout error', error);
    res.status(500).json({ error: `Internal server error: ${error.message}` });
  }
}

module.exports = {
  signup,
  login,
  resetPassword,
  generateTotpSecret,
  verifyAndEnableTotp,
  approveUser,
  getAllUsers,
  getAllRoles,
  logout,
  checkAvailability
};
