// Mailer config / test endpoints — mounted by buildApp() extraRoutes at
// /api/v1/mailer (see the mount snippet returned to the orchestrator).
//
//   GET  /config  → returns whether key is set and the env-configured recipient
//   POST /config  → persists { secretKey } in DB (signalEmail comes from env)
//   POST /test     → sends a test email to verify configuration
//
// Public in the legacy source (flat router, no auth shell). That was a security
// regression (unauth read/write of the mailer secret), so these now require
// protect + the MAILER_CONFIG master permission (read for the GET, update for
// the POST writes).
const express = require('express');

const { protect } = require('@startup/src/middleware/authMiddleware');
const requirePermission = require('@startup/src/middleware/requirePermission');
const { MASTER_PERMISSION_CONSTANTS } = require('../constants/permissions');
const { getMailerConfigView, saveMailerConfigView, sendTestMailView } = require('../views/mailerView');

const router = express.Router();

const { MAILER_CONFIG } = MASTER_PERMISSION_CONSTANTS;

router.get('/config', protect, requirePermission(MAILER_CONFIG.read.name), getMailerConfigView);
router.post('/config', protect, requirePermission(MAILER_CONFIG.update.name), saveMailerConfigView);
router.post('/test', protect, requirePermission(MAILER_CONFIG.update.name), sendTestMailView);

module.exports = router;
