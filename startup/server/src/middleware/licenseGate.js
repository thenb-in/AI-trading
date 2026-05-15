'use strict';

// Global license gate. Mounted before any route that should be blocked
// when the license is missing/expired/tampered.
//
// User-chosen policy: IMMEDIATE HARD STOP on any verification failure
// (no grace, no read-only). The only endpoints reachable past the gate
// when the license is invalid are the ones in `EXEMPT_PATHS` — diagnostic
// and license-recovery routes operators need to fix the install.
//
// Failure response is a 503 (service unavailable) with a JSON body that
// surfaces the rejection reason. We use 503 rather than 401/403 because
// it accurately tells client apps "the server is up but won't serve work
// — try later / contact admin", which renders nicer in our React layer
// than auth-style errors.

const logger = require('../../logger');
const licenseService = require('../license/licenseService');

const EXEMPT_PATH_PREFIXES = [
  '/api/healthz',
  // License recovery + status endpoints — must be reachable when the
  // license itself is invalid so an operator can fix the install.
  '/api/v1/license',
  // Allow auth so an admin can log in to a license-locked instance and
  // run the recovery flow from the UI. Without this, a locked install
  // becomes unrecoverable through the web UI.
  '/api/v1/auth/login',
  '/api/v1/auth/logout'
];

function isExempt(req) {
  const url = req.originalUrl || req.url || '';
  return EXEMPT_PATH_PREFIXES.some(p => url.startsWith(p));
}

function licenseGate() {
  return async function licenseGateMiddleware(req, res, next) {
    if (isExempt(req)) {
      return next();
    }

    try {
      const state = await licenseService.loadAndVerify();
      if (state.ok) {
        return next();
      }
      // Verification failed — hard stop.
      logger.warn(`[license-gate] blocked ${req.method} ${req.originalUrl} reason=${state.reason}`);
      return res.status(503).json({
        error: 'license_invalid',
        reason: state.reason,
        message: 'This server is not licensed to run. Contact your administrator.',
        recovery: {
          status_endpoint: '/api/v1/license/status',
          airgap_request_endpoint: '/api/v1/license/airgap-request',
          airgap_apply_endpoint: '/api/v1/license/airgap-apply'
        }
      });
    } catch (err) {
      logger.error(`[license-gate] unexpected error: ${err.message}`, err);
      return res.status(503).json({
        error: 'license_check_failed',
        message: err.message
      });
    }
  };
}

module.exports = licenseGate;
module.exports.EXEMPT_PATH_PREFIXES = EXEMPT_PATH_PREFIXES;
