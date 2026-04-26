const express = require('express');
const authMiddleware = require('../../middleware/authMiddleware');
const authValidator = require('../../validators/startup/authValidator');
const { signup, login, resetPassword, approveUser, getAllUsers, getAllRoles, logout, generateTotpSecret, verifyAndEnableTotp } = require('../../views/startup/authView');

const router = express.Router();

// Public routes
router.post('/signup', authValidator.signupValidation, signup);
router.post('/login', authValidator.loginValidation, login);
router.post('/reset-password', authValidator.resetPasswordValidation, resetPassword);
router.post('/logout', authMiddleware.protect, logout);
// Protected routes (admin only)
router.post('/approve/:userId', authMiddleware.protect, authValidator.approveUserValidation, approveUser);
router.get('/users', authMiddleware.protect, getAllUsers);

router.get('/roles', getAllRoles);

// TOTP routes
router.post('/generate-totp-secret', authValidator.generateTotpSecretValidation, generateTotpSecret);
router.post('/verify-totp', authValidator.verifyTotpValidation, verifyAndEnableTotp);

module.exports = router;
