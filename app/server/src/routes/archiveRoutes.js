// Historical data archive endpoints — mounted by buildApp() extraRoutes at
// /api/v1/market/history (see the mount snippet returned to the orchestrator).
//
//   GET  /status            what the archive holds
//   POST /archive/index     backfill 1-min index candles (?symbol=&days=)
//   POST /archive/options   harvest live near-ATM option candles now (?symbol=)
//
// Public in the legacy source (flat router, no auth shell); kept public here to
// preserve behaviour — see FINDINGS.
const express = require('express');

const { getStatusView, archiveIndexView, archiveOptionsView } = require('../views/archiveView');

const router = express.Router();

router.get('/status', getStatusView);
router.post('/archive/index', archiveIndexView);
router.post('/archive/options', archiveOptionsView);

module.exports = router;
