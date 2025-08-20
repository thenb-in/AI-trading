const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

// Public routes
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/reset-password', authController.resetPassword);
router.post('/logout',authMiddleware.protect, authController.logout);
// Protected routes (admin only)
router.post('/approve/:userId', authMiddleware.protect, authController.approveUser);
router.get('/users', authMiddleware.protect, authController.getAllUsers);

router.get('/roles', authController.getAllRoles);
module.exports = router;