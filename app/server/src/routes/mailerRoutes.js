// Mailer config / test endpoints — mounted by buildApp() extraRoutes at
// /api/v1/mailer (see the mount snippet returned to the orchestrator).
//
//   GET  /config  → returns whether key is set and the env-configured recipient
//   POST /config  → persists { secretKey } in DB (signalEmail comes from env)
//   POST /test     → sends a test email to verify configuration
//
// Public in the legacy source (flat router, no auth shell); kept public here to
// preserve behaviour — see FINDINGS.
const express = require('express');

const { getMailerConfigView, saveMailerConfigView, sendTestMailView } = require('../views/mailerView');

const router = express.Router();

router.get('/config', getMailerConfigView);
router.post('/config', saveMailerConfigView);
router.post('/test', sendTestMailView);

module.exports = router;
