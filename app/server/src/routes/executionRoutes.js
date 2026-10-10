// Auto-trade / live-execution routes (the /live and trade-desk control
// surface). Mounted by buildApp() extraRoutes at /api/v1/market — see the mount
// snippet returned to the orchestrator for index.js. Paths are kept under
// /method2/* to match the source URLs the migrated client still calls.
//
// Gated by the AUTO_EXECUTION master permission (read for state, update for the
// mode switch / catch-up / GTT writes), spliced into app_permissions.js by the
// orchestrator (see the permission snippet in the agent report).
const express = require('express');

const { protect } = require('@startup/src/middleware/authMiddleware');
const requirePermission = require('@startup/src/middleware/requirePermission');
const { MASTER_PERMISSION_CONSTANTS } = require('../constants/permissions');
const views = require('../views/executionView');

const router = express.Router();

const { AUTO_EXECUTION } = MASTER_PERMISSION_CONSTANTS;

router.get('/method2/autotrade', protect, requirePermission(AUTO_EXECUTION.read.name), views.autotradeStateView);
router.post('/method2/autotrade', protect, requirePermission(AUTO_EXECUTION.update.name), views.setModeView);
router.post('/method2/catchup', protect, requirePermission(AUTO_EXECUTION.update.name), views.catchUpView);
router.post('/method2/gtt', protect, requirePermission(AUTO_EXECUTION.update.name), views.modifyGttView);

module.exports = router;
