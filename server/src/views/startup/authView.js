/**
 * View layer for authentication endpoints
 * Handles request parsing, validation, controller calls, and response building
 */
const logger = require('../../../logger');
const env = require('../../config/env');
const { MASTER_PERMISSION_CONSTANTS } = require('../../constants/permissions');
const authController = require('../../controllers/startup/authController');
const allowedPermissions = require('../../utils/startup/allowedPermissions');

/**
 * Sign up view
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
async function signup(req, res) {
  try {
    // Extract data from request (company_id optional, e.g. from /signup?company_id=uuid)
    const { phone, username, password, name, role, company_id, companyId } = req.body;
    const companyIdResolved = company_id ?? companyId ?? null;

    // Call controller
    const user = await authController.signup(username, password, companyIdResolved, { phone, name, role });

    // Build and send response
    res.status(201).json({ message: `User registered successfully, awaiting admin approval for ${username}`, userId: user.id });
  } catch (error) {
    // Handle specific errors with proper status codes
    // eslint-disable-next-line custom/no-hardcoded-strings
    const errorMessage = error.message || 'An error occurred during signup';

    if (errorMessage.includes('Invalid role')) {
      return res.status(400).json({ error: errorMessage });
    }
    if (errorMessage.includes('Company not found')) {
      return res.status(404).json({ error: errorMessage });
    }
    // eslint-disable-next-line custom/no-hardcoded-strings
    if (errorMessage.includes('Phone number already exists') || errorMessage.includes('username')) {
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
    const loginResult = await authController.loginUser(req.body);
    const { user, accessToken, refreshToken, insufficientWallet, walletMessage, requiresOnboarding } = loginResult;

    // Set HTTP-only cookies
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: env.isProduction,
      sameSite: 'strict',
      maxAge: env.MAX_JWT_ACCESS_EXPIRATION_MS
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: env.isProduction,
      sameSite: 'strict',
      maxAge: env.MAX_JWT_REFRESH_EXPIRATION_MS
    });

    // Non-HTTP-only cookie for frontend state
    res.cookie('isLoggedIn', 'true', {
      secure: env.isProduction,
      sameSite: 'strict',
      maxAge: env.MAX_JWT_REFRESH_EXPIRATION_MS
    });

    // Build and send response
    const response = { user };
    if (insufficientWallet !== undefined) {
      response.insufficientWallet = insufficientWallet;
    }
    if (walletMessage) {
      response.walletMessage = walletMessage;
    }
    if (requiresOnboarding !== undefined) {
      response.requiresOnboarding = requiresOnboarding;
    }
    res.json(response);
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
    if (error.requiresTotpSetup) {
      return res.status(403).json({ error: error.message, requiresTotpSetup: true });
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
    const { username, password, isFirstLogin, otp } = req.body;

    // Call controller
    await authController.resetPassword({ username, password, isFirstLogin, otp });

    // Build and send response
    res.status(200).json({ message: `Password reset successfully,for ${username}` });
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
    const { requirePasswordReset = false, roleId = null } = req.body;
    const currentUserId = req.user.id;

    // Permission check
    const requiredPermission = MASTER_PERMISSION_CONSTANTS.USER.approve.name;
    const hasPermission = await allowedPermissions(currentUserId, [requiredPermission]);
    if (!hasPermission) {
      return res.status(404).json({ error: `You are not authorized to access this resource ${requiredPermission}` });
    }

    // Call controller
    await authController.approveUser(userId, requirePasswordReset, roleId);

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
    res.status(200).json({ message: `User with id:${userId} logged out successfully` });
  } catch (error) {
    logger.error('Logout error', error);
    res.status(500).json({ error: `Internal server error: ${error.message}` });
  }
}

/**
 * Generate TOTP secret view
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
async function generateTotpSecret(req, res) {
  try {
    // Extract data from request
    const { username } = req.body;

    // Call controller
    const totpData = await authController.generateTotpSecret(username);

    // Build and send response
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
 * Verify and enable TOTP view
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
async function verifyAndEnableTotp(req, res) {
  // Extract data from request
  const { username, totpCode } = req.body;
  try {
    // Call controller
    const result = await authController.verifyAndEnableTotp(username, totpCode);

    // Build and send response
    res.status(200).json(result);
  } catch (error) {
    if (error.message === 'User not found') {
      return res.status(404).json({ error: error.message });
    }
    if (error.message === `Invalid TOTP code:${totpCode}` || error.message === `TOTP is already enabled for this user:${username}`) {
      return res.status(400).json({ error: error.message });
    }
    logger.error('Verify and enable TOTP error', error);
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
  logout,
  generateTotpSecret,
  verifyAndEnableTotp
};
