const express = require('express');
const authMiddleware = require('../../middleware/authMiddleware');
const authValidator = require('../../validators/startup/authValidator');
const { signup, login, resetPassword, approveUser, getAllUsers, getAllRoles, logout } = require('../../views/startup/authView');

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
module.exports = router;
