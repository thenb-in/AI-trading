/**
 * View layer for authentication endpoints
 * Handles request parsing, validation, controller calls, and response building
 */
const logger = require('../../logger');
const { MASTER_PERMISSION_CONSTANTS } = require('../constants/base_permissions');
const authController = require('../controllers/authController');
const allowedPermissions = require('../utils/allowedPermissions');
const { setAuthCookies } = require('../utils/auth_shared_utils');
const { sequelizeErrors } = require('../constants/errors');

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
    // Sequelize unique/validation errors default to message = "Validation error";
    // unwrap .errors[] so the caller sees what actually failed (e.g.
    // "username must be unique") instead of the generic string.
    if (error.name === sequelizeErrors.SEQUELIZE_UNIQUE_CONSTRAINT_ERROR || error.name === sequelizeErrors.SEQUELIZE_VALIDATION_ERROR) {
      const detail = error.errors?.[0]?.message || error.message;
      logger.error('Signup error (sequelize)', error);
      const status = error.name === sequelizeErrors.SEQUELIZE_UNIQUE_CONSTRAINT_ERROR ? 409 : 400;
      return res.status(status).json({ error: detail });
    }

    // eslint-disable-next-line custom/no-hardcoded-strings
    const errorMessage = error.message || 'An error occurred during signup';

    if (errorMessage.includes('Company not found')) {
      return res.status(404).json({ error: errorMessage });
    }
    if (errorMessage.includes('Invalid role')) {
      return res.status(400).json({ error: errorMessage });
    }
    // eslint-disable-next-line custom/no-hardcoded-strings
    if (errorMessage.includes('Phone number already exists') || errorMessage.includes('username') || errorMessage.includes('Username')) {
      return res.status(409).json({ error: errorMessage });
    }

    // Log the full error for debugging
    logger.error('Signup error', error);

    // Return user-friendly error message
    res.status(500).json({ error: errorMessage });
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
    const { username, password, isFirstLogin } = req.body;

    // Call controller
    await authController.resetPassword({ username, password, isFirstLogin });

    // Build and send response
    res.status(200).json({ message: `Password reset successfully, account deactivated, pending admin approval ${username}` });
  } catch (error) {
    if (error.message === 'User not found') {
      return res.status(404).json({ error: error.message });
    }
    logger.error('Reset password error', error);
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
    // Extract data from request
    const userId = req.user.id;

    // Call controller (if any cleanup needed)
    await authController.logout(userId);

    // Clear cookies
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    res.clearCookie('isLoggedIn');

    // Build and send response
    res.status(200).json({ message: `User logged out successfully ${userId}` });
  } catch (error) {
    logger.error('Logout error', error);
    res.status(500).json({ error: `Internal server error: ${error.message}` });
  }
}

module.exports = {
  signup,
  login,
  resetPassword,
  approveUser,
  getAllUsers,
  getAllRoles,
  logout
};
