// Historical data archive endpoints — mounted by buildApp() extraRoutes at
// /api/v1/market/history (see the mount snippet returned to the orchestrator).
//
//   GET  /status            what the archive holds
//   POST /archive/index     backfill 1-min index candles (?symbol=&days=)
//   POST /archive/options   harvest live near-ATM option candles now (?symbol=)
//
// Public in the legacy source (flat router, no auth shell). That was a security
// regression (unauth data backfill), so these now require protect + the
// HISTORY_ARCHIVE master permission (read for the status GET, update for the
// backfill POSTs).
const express = require('express');

const { protect } = require('@startup/src/middleware/authMiddleware');
const requirePermission = require('@startup/src/middleware/requirePermission');
const { MASTER_PERMISSION_CONSTANTS } = require('../constants/permissions');
const { getStatusView, archiveIndexView, archiveOptionsView } = require('../views/archiveView');

const router = express.Router();

const { HISTORY_ARCHIVE } = MASTER_PERMISSION_CONSTANTS;

router.get('/status', protect, requirePermission(HISTORY_ARCHIVE.read.name), getStatusView);
router.post('/archive/index', protect, requirePermission(HISTORY_ARCHIVE.update.name), archiveIndexView);
router.post('/archive/options', protect, requirePermission(HISTORY_ARCHIVE.update.name), archiveOptionsView);

module.exports = router;
