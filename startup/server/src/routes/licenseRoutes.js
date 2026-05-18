'use strict';

// Endpoints exposed on every framework install. ALL of these are exempt
// from the license gate so an admin can use them to recover a locked
// install (see middleware/licenseGate.js EXEMPT_PATH_PREFIXES).
//
//   GET  /api/license/status           — public read of current license
//                                        state (no PII). Used by the UI
//                                        banner and by uptime checks.
//   POST /api/license/refresh          — admin: trigger an online renewal
//                                        against WALLET_SERVER_URL.
//   POST /api/license/airgap-request   — admin: returns a JSON bundle the
//                                        operator carries to the wallet.
//   POST /api/license/airgap-apply     — admin: accepts a wallet-issued
//                                        token, verifies + installs it.
//   POST /api/license/install          — admin: same as airgap-apply but
//                                        intended for first-time install
//                                        when no current license exists.
//   GET  /api/license/machine          — admin: show this machine's
//                                        fingerprint + raw inputs (MACs,
//                                        machine-id) so the operator can
//                                        report them when requesting a
//                                        license from the issuer.
//
// Auth: status + machine are public to authenticated users via the same
// admin auth as the rest. We don't expose them anonymously because
// fingerprint + license state are useful recon for an attacker. The
// gate-exemption is about LICENSE state, not auth state — auth still
// applies.

const express = require('express');
const licenseService = require('../license/licenseService');
const machineFingerprint = require('../license/machineFingerprint');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Status is the one path we keep fully public — uptime probes and the
// frontend login screen need to render "this server is locked" without
// being authenticated. Returns minimal info; no permission list or
// fingerprint.
router.get('/status', (req, res) => {
  const snap = licenseService.getStatusSnapshot();
  if (!snap || (snap.ok === false && snap.reason === 'not_loaded')) {
    // Force a load on first hit if the server just booted.
    return licenseService.loadAndVerify().then(() => {
      res.status(200).json(licenseService.getStatusSnapshot());
    });
  }
  res.status(200).json({
    ok: snap.ok,
    bypass: snap.bypass || false,
    reason: snap.reason || null,
    expires_at: snap.expires_at || null,
    days_until_expiry: snap.days_until_expiry ?? null,
    renewal_after: snap.renewal_after || null,
    renewal_mode: snap.renewal_mode || null,
    serial: snap.serial ?? null
  });
});

router.get('/machine', authMiddleware.protect, (req, res) => {
  try {
    const fp = machineFingerprint.compute();
    res.status(200).json(fp);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/refresh', authMiddleware.protect, async (req, res) => {
  try {
    const result = await licenseService.renewOnline();
    res.status(200).json({
      ok: true,
      serial: result.payload.serial,
      expires_at: result.payload.expires_at
    });
  } catch (err) {
    res.status(502).json({ ok: false, error: err.message });
  }
});

router.post('/airgap-request', authMiddleware.protect, (req, res) => {
  try {
    const bundle = licenseService.buildAirgapRequest();
    // The operator typically saves this as JSON and ferries it to the
    // wallet's `/license/airgap-renew` endpoint.
    res.setHeader('Content-Disposition', `attachment; filename="license-renewal-request-${Date.now()}.json"`);
    res.status(200).json(bundle);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/airgap-apply', authMiddleware.protect, async (req, res) => {
  try {
    const { token } = req.body || {};
    const result = await licenseService.applyAirgapResponse({ token });
    res.status(200).json({
      ok: true,
      serial: result.payload.serial,
      expires_at: result.payload.expires_at
    });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message, detail: err.detail || null });
  }
});

// `install` and `airgap-apply` do the same thing today; we expose both
// so first-install UX can use a distinct, semantically-clearer URL. If
// they diverge later (e.g. install requires a fresh license_id while
// airgap-apply allows reissue), the split is already in place.
router.post('/install', authMiddleware.protect, async (req, res) => {
  try {
    const { token } = req.body || {};
    const result = await licenseService.installToken({ token });
    res.status(200).json({
      ok: true,
      license_id: result.payload.license_id,
      serial: result.payload.serial,
      expires_at: result.payload.expires_at
    });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

module.exports = router;
