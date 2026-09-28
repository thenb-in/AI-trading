const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');
const requirePermission = require('../middleware/requirePermission');
const { MASTER_PERMISSION_CONSTANTS } = require('../constants/permissions');

const { USER } = MASTER_PERMISSION_CONSTANTS;

router.get('/', authMiddleware.protect, userController.getAllUsers);
router.get('/me', authMiddleware.protect, userController.getMe);
// Before '/:userId', or the literal path is read as a user id.
router.get('/sessions', authMiddleware.protect, requirePermission(USER.read.name), userController.getUserSessions);
router.post('/:userId/deactivate', authMiddleware.protect, requirePermission(USER.deactivate.name), userController.deactivateUser);
// Cutting someone's sessions is cutting their access, so it takes the same
// permission as deactivating them.
router.post('/:userId/sign-out', authMiddleware.protect, requirePermission(USER.deactivate.name), userController.signOutUser);
// Sign a user out of a single device (one login session), same permission.
router.post('/:userId/sessions/:sessionId/sign-out', authMiddleware.protect, requirePermission(USER.deactivate.name), userController.signOutDevice);
router.get('/:userId', authMiddleware.protect, userController.getMe);
router.delete('/:userId', authMiddleware.protect, requirePermission(USER.delete.name), userController.deleteUser);
// Which role someone holds is what they can do, so changing it is editing the
// user - it must not be reachable by whoever happens to be signed in.
router.put('/:userId/role', authMiddleware.protect, requirePermission(USER.update.name), userController.updateUserRole);
router.put('/:userId/deviceAccess', authMiddleware.protect, requirePermission(USER.update.name), userController.updateUserDeviceAccess);
router.put('/:userId', authMiddleware.protect, requirePermission(USER.update.name), userController.updateUser);
// The user whose profile is written comes from the body, not the session, so
// this edits whoever it is pointed at — the same reach as PUT /:userId, and it
// takes the same permission.
router.post('/userProfile', authMiddleware.protect, requirePermission(USER.update.name), userController.updateUserProfile);
module.exports = router;
