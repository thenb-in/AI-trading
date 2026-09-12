// Report routes the framework itself ships.

const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const requirePermission = require('../middleware/requirePermission');
const { REPORT_PERMISSION_CONSTANTS } = require('../constants/base_permissions');
const { getNotificationLogReport } = require('../views/reports/notificationLogReport');

const router = express.Router();
router.use(authMiddleware.protect); // Protect all routes

router.get(
  '/notification-log-report',
  requirePermission(REPORT_PERMISSION_CONSTANTS.NOTIFICATION_LOG_REPORT.name),
  getNotificationLogReport
);

module.exports = router;
