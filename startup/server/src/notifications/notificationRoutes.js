const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const requirePermission = require('../middleware/requirePermission');
const { MODULE_PERMISSION_CONSTANTS } = require('../constants/permissions');
const {
  getNotifications,
  markRead,
  markAllRead
} = require('./notificationView');

const router = express.Router();
const { VIEW_NOTIFICATION } = MODULE_PERMISSION_CONSTANTS;

router.use(authMiddleware.protect, requirePermission(VIEW_NOTIFICATION.name));

router.get('/', getNotifications);
router.patch('/read-all', markAllRead);
router.patch('/:id/read', markRead);

module.exports = router;
