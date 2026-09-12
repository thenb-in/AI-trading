// Report routes the framework itself ships.
//
// The server-side twin of client/src/data/genericReportModules.js: the app declares its
// reports on its own router (app/server/src/routes/reportRoutes.js), the framework
// declares its here, and the report registry merges the two — so an app gets
// these reports without listing them.
//
// Every GET route here is indexed by slug for the socket report runner, the same
// way the app's are, so a report added below is reachable over both transports.

const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const requirePermission = require('../middleware/requirePermission');
const { REPORT_PERMISSION_CONSTANTS } = require('../constants/base_permissions');
const { getNotificationLogReport } = require('../views/reports/notificationLogReport');

const router = express.Router();
router.use(authMiddleware.protect); // Protect all routes

// Every message a notification rule sent, over which channel, to whom, and
// whether it arrived. Its own permission: the log carries message bodies, so it
// is not granted by the ability to edit rules.
router.get(
  '/notification-log-report',
  requirePermission(REPORT_PERMISSION_CONSTANTS.NOTIFICATION_LOG_REPORT.name),
  getNotificationLogReport
);

module.exports = router;
