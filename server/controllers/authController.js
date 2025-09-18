const authService = require('../services/authService');
const { validationResult } = require('express-validator');
const { body } = require('express-validator');
const allowedPermissions = require('../utils/allowedPermissions');
const logger = require('../logger');
const env = require('../config/env');

const signupValidation = [
  body('phone').isMobilePhone().withMessage('Invalid phone number for signup'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one number'),
  body('name').notEmpty().withMessage('Name is required'),
  body('companyId').isUUID().withMessage('Invalid company ID')
];

const loginValidation = [
  body('password').notEmpty().withMessage('Password is required')
];

if (env.isProduction) {
  loginValidation.push(body('phone').isMobilePhone().withMessage('Invalid phone number for login'));
}

const resetPasswordValidation = [
  body('phone').isMobilePhone().withMessage('Invalid phone number for reset password'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters')
    .matches(/[A-Z]/)
    .withMessage('New password must contain at least one uppercase letter')
    .matches(/[0-9]/)
    .withMessage('New password must contain at least one number')
];

const signup = async (req, res) => {
  try {
    const { phone, username, password, name, companyId, role } = req.body;
    const user = await authService.signup({ phone, username, password, name, companyId, role });
    res.status(201).json({ message: 'User registered successfully, awaiting admin approval', userId: user.id });
  } catch (error) {
    if (error.message === 'Phone number already exists') {
      return res.status(409).json({ error: error.message });
    }
    if (error.message === 'Company not found') {
      return res.status(404).json({ error: error.message });
    }
    logger.error(`Signup error: ${error.message} - Stack: ${error.stack}`);
    res.status(500).json({ error: 'Internal server error' });
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

    res.json({
      user: {
        id: user.id,
        phone: user.phone,
        username: user.username,
        name: user.name,
        role: user.role,
        companyId: user.companyId,
        isActive: user.isActive
      }
    });
  } catch (error) {
    if (error.message === 'User not found' || error.message === 'Invalid credentials') {
      return res.status(401).json({ error: 'Invalid phone or password' });
    }
    if (error.message === 'Account not found') {
      return res.status(403).json({ error: 'Account not found' });
    }
    if (error.message === 'Account not active') {
      return res.status(403).json({ error: 'Account awaiting admin approval' });
    }
    if (error.message === 'Your account is pending admin approval. Please try again later.') {
      return res.status(403).json({ error: error.message });
    }
    logger.error('Login error' + error.message + ':' + error.stack);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { username, password } = req.body;
    await authService.resetPassword({ username, password });
    res.status(200).json({ message: 'Password reset successfully, account deactivated pending admin approval' });
  } catch (error) {
    if (error.message === 'User not found') {
      return res.status(404).json({ error: error.message });
    }
    logger.error('Reset password error' + error.message + ':' + error.stack);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const approveUser = async (req, res) => {
  const requiredPermission = 'Approve User';
  const hasPermission = await allowedPermissions(req.user.id, [requiredPermission]);
  if (!hasPermission) {
    return res.status(404).json({ error: 'You are not authorized to access this resource ' + requiredPermission });
  }

  try {
    const { userId } = req.params;

    await authService.approveUser(userId);
    res.status(200).json({ message: 'User approved successfully' });
  } catch (error) {
    if (error.message === 'User not found') {
      return res.status(404).json({ error: error.message });
    }
    logger.error('Approve user error' + error.message + ':' + error.stack);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await authService.getAllUsers();
    res.status(200).json(users);
  } catch (error) {
    logger.error(`Get all users error: ${error.message} - Stack: ${error.stack}`);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getAllRoles = async (req, res) => {
  try {
    const roles = await authService.getAllRoles();
    res.status(200).json(roles);
  } catch (error) {
    logger.error(`Get all roles error: ${error.message} - Stack: ${error.stack}`);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const logout = async (req, res) => {
  try {
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    res.clearCookie('isLoggedIn');
    res.status(200).json({ message: 'User logged out successfully' });
  } catch (error) {
    logger.error(`Logout error: ${error.message} - Stack: ${error.stack}`);
    res.status(500).json({ error: 'Internal server error' });
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
