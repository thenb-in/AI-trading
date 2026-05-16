const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/', authMiddleware.protect, userController.getAllUsers);
router.get('/me', authMiddleware.protect, userController.getMe);
router.post('/:userId/deactivate', authMiddleware.protect, userController.deactivateUser);
router.get('/:userId', authMiddleware.protect, userController.getMe);
router.delete('/:userId', authMiddleware.protect, userController.deleteUser);
router.put('/:userId/role', authMiddleware.protect, userController.updateUserRole);
router.put('/:userId/deviceAccess', authMiddleware.protect, userController.updateUserDeviceAccess);
router.post('/userProfile', authMiddleware.protect, userController.updateUserProfile);
module.exports = router;
