const authService = require('../../services/startup/authService');
const { validationResult } = require('express-validator');
const { body } = require('express-validator');
const allowedPermissions = require('../../utils/startup/allowedPermissions');
const logger = require('../../../logger');
const env = require('../../config/env');
const userService = require('../../services/startup/userService');

const signupValidation = [
  body('phone').isMobilePhone().withMessage(`Invalid phone number for signup ${body('phone').value}.`),
  body('password')
    .isLength({ min: 8 })
    .withMessage(`Password must be at least 8 characters ${body('password').value}.`)
    .matches(/[A-Z]/)
    .withMessage(`Password must contain at least one uppercase letter ${body('password').value}.`)
    .matches(/[0-9]/)
    .withMessage(`Password must contain at least one number ${body('password').value}.`),
  body('name').notEmpty().withMessage('Name is required'),
  body('companyId').isUUID().withMessage('Invalid company ID')
];

const loginValidation = [
  body('password').notEmpty().withMessage(`Password is required ${body('password').value}.`)
];

// if (env.isProduction) {
//   loginValidation.push(body('phone').isMobilePhone().withMessage('Invalid phone number for login'));
// }

const resetPasswordValidation = [
  body('phone').isMobilePhone().withMessage(`Invalid phone number for reset password ${body('phone').value}.`),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage(`New password must be at least 8 characters ${body('newPassword').value}.`)
    .matches(/[A-Z]/)
    .withMessage(`New password must contain at least one uppercase letter ${body('newPassword').value}.`)
    .matches(/[0-9]/)
    .withMessage(`New password must contain at least one number ${body('newPassword').value}.`)
];

const signup = async (req, res) => {
  const { phone, username, password, name, companyId, role } = req.body;
  try {
    const user = await authService.signup(username, password, companyId, { phone, name, role });
    res.status(201).json({ message: `User registered successfully, awaiting admin approval for ${username}`, userId: user.id });
  } catch (error) {
    if (error.message === `Phone number already exists ${phone}.`) {
      return res.status(409).json({ error: error.message });
    }
    if (error.message === `Company not found ${companyId}.`) {
      return res.status(404).json({ error: error.message });
    }
    logger.error(`Signup error: ${error.message} - Stack: ${error.stack}`);
    res.status(500).json({ error: `Internal server error: ${error.message}` });
  }
};

const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { user, accessToken, refreshToken } = await authService.loginUser(req.body);

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

    res.json({ user });
  } catch (error) {
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
    logger.error(`Login error: ${error.message} - Stack: ${error.stack}`);
    res.status(500).json({ error: `Internal server error: ${error.message}` });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { username, password, isFirstLogin } = req.body;
    await authService.resetPassword({ username, password, isFirstLogin });
    res.status(200).json({ message: `Password reset successfully, account deactivated, pending admin approval ${username}` });
  } catch (error) {
    if (error.message === 'User not found') {
      return res.status(404).json({ error: error.message });
    }
    logger.error(`Reset password error: ${error.message} - Stack: ${error.stack}`);
    res.status(500).json({ error: `Internal server error: ${error.message}` });
  }
};

const approveUser = async (req, res) => {
  const requiredPermission = 'Approve User';
  const hasPermission = await allowedPermissions(req.user.id, [requiredPermission]);
  if (!hasPermission) {
    return res.status(404).json({ error: `You are not authorized to access this resource ${requiredPermission}` });
  }

  try {
    const { userId } = req.params;

    await authService.approveUser(userId);
    res.status(200).json({ message: `User approved successfully ${userId}` });
  } catch (error) {
    if (error.message === 'User not found') {
      return res.status(404).json({ error: error.message });
    }
    logger.error(`Approve user error: ${error.message} - Stack: ${error.stack}`);
    res.status(500).json({ error: `Internal server error: ${error.message}` });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const users = await userService.getAllUsers(companyId);
    res.status(200).json(users);
  } catch (error) {
    logger.error(`Get all users error: ${error.message} - Stack: ${error.stack}`);
    res.status(500).json({ error: `Internal server error: ${error.message}` });
  }
};

const getAllRoles = async (req, res) => {
  try {
    const roles = await authService.getAllRoles();
    res.status(200).json(roles);
  } catch (error) {
    logger.error(`Get all roles error: ${error.message} - Stack: ${error.stack}`);
    res.status(500).json({ error: `Internal server error: ${error.message}` });
  }
};

const logout = async (req, res) => {
  try {
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    res.clearCookie('isLoggedIn');
    res.status(200).json({ message: `User logged out successfully ${req.user.username}` });
  } catch (error) {
    logger.error(`Logout error: ${error.message} - Stack: ${error.stack}`);
    res.status(500).json({ error: `Internal server error: ${error.message}` });
  }
};

module.exports = {
  signup: [...signupValidation, signup],
  login: [...loginValidation, login],
  resetPassword: [...resetPasswordValidation, resetPassword],
  approveUser,
  getAllUsers,
  getAllRoles,
  logout
};
