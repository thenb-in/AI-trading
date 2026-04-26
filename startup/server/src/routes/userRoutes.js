const express = require('express');
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', authMiddleware.protect, userController.getAllUsers);
router.get('/me', authMiddleware.protect, userController.getMe);
router.post('/:userId/deactivate', authMiddleware.protect, userController.deactivateUser);
router.get('/:userId', authMiddleware.protect, userController.getMe);
router.delete('/:userId', authMiddleware.protect, userController.deleteUser);
router.put('/:userId/role', authMiddleware.protect, userController.updateUserRole);
router.put('/:userId/deviceAccess', authMiddleware.protect, userController.updateUserDeviceAccess);
router.post('/userProfile', authMiddleware.protect, userController.updateUserProfile);
module.exports = router;
