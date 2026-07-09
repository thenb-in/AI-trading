const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');
const requirePermission = require('../middleware/requirePermission');
const { MODULE_PERMISSION_CONSTANTS } = require('../constants/permissions');

const { USER } = MODULE_PERMISSION_CONSTANTS;

router.get('/', authMiddleware.protect, userController.getAllUsers);
router.get('/me', authMiddleware.protect, userController.getMe);
router.post('/:userId/deactivate', authMiddleware.protect, requirePermission(USER.deactivate.name), userController.deactivateUser);
router.get('/:userId', authMiddleware.protect, userController.getMe);
router.delete('/:userId', authMiddleware.protect, requirePermission(USER.delete.name), userController.deleteUser);
router.put('/:userId/role', authMiddleware.protect, userController.updateUserRole);
router.put('/:userId/deviceAccess', authMiddleware.protect, userController.updateUserDeviceAccess);
router.put('/:userId', authMiddleware.protect, requirePermission(USER.update.name), userController.updateUser);
router.post('/userProfile', authMiddleware.protect, userController.updateUserProfile);
module.exports = router;
