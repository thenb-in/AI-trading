// Scalp engine HTTP routes — the legacy /market/scalp* handlers, now
// Route → View → Controller → Service.
//
// Mounted by buildApp() extraRoutes at `${prefix}/market/scalp` (see the mount
// snippet returned to the orchestrator for index.js).
//
// The legacy routes were public; conforming to the framework shell they are
// gated by `protect` + the Scalp Dashboard module permission spliced into
// app_permissions.js (SCALP_DASHBOARD). See FINDINGS — this is a structural
// conforming change, not a logic change.
const express = require('express');

const { protect } = require('@startup/src/middleware/authMiddleware');
const requirePermission = require('@startup/src/middleware/requirePermission');
const { MODULE_PERMISSION_CONSTANTS } = require('../constants/permissions');
const view = require('../views/scalpView');

const router = express.Router();

const { SCALP_DASHBOARD } = MODULE_PERMISSION_CONSTANTS;

router.use(protect, requirePermission(SCALP_DASHBOARD.name));

router.get('/', view.getLiveScalpView);
router.get('/backtest', view.getBacktestView);
router.get('/breakeven', view.getBreakevenView);
router.get('/paper', view.getPaperStatsView);
router.post('/paper/tick', view.runPaperTickView);
router.post('/report/run', view.runShapeReportView);
router.post('/report/matrix', view.runMatrixReportView);
router.get('/config', view.getConfigView);
router.get('/report', view.listReportsView);
router.get('/report/:id', view.getReportView);

module.exports = router;
