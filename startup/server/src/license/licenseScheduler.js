'use strict';

// Registers two in-process cron jobs for the license subsystem:
//
//   1. "license-renew" — runs every hour. Checks if we're inside the
//      renewal window (renewal_after ≤ now < expires_at) and, if so,
//      attempts an online renewal against the wallet. Renewal mode must
//      be 'online' (the other modes are operator-driven).
//
//   2. "license-wallclock-bump" — runs every 5 minutes. Bumps the seal's
//      last_wallclock so a clock-rollback while the server is running is
//      detected at next verification rather than silently accepted.
//
// Apps that don't want the framework's auto-renewal can leave
// `LICENSE_AUTO_RENEW=false` in their env; the renew job is registered
// disabled and the wallclock bumper still runs (it's harmless when no
// license is installed).

const logger = require('../../logger');
const env = require('../config/env');
const { registerJob } = require('../../scheduler');
const licenseSeal = require('./licenseSeal');
const licenseService = require('./licenseService');

function isAutoRenewEnabled() {
  const v = env.LICENSE_AUTO_RENEW.toLowerCase();
  return v === 'true' || v === '1' || v === 'on' || v === 'yes';
}

async function tryRenew() {
  const state = licenseService.getCurrentState();
  if (!state || !state.ok || state.bypass) {
    return;
  }
  const payload = state.payload;
  if (!payload) {
    return;
  }
  if ((payload.renewal_mode || 'online') !== 'online') {
    // Airgap or manual renewal: don't attempt to phone home, but DO log
    // the impending expiry so ops dashboards can pick it up.
    const daysLeft = Math.ceil((new Date(payload.expires_at) - Date.now()) / 86400000);
    if (daysLeft <= 7) {
      logger.warn(`[license] non-online license expires in ${daysLeft}d (renewal_mode=${payload.renewal_mode})`);
    }
    return;
  }
  const now = Date.now();
  const renewalAfter = payload.renewal_after ? new Date(payload.renewal_after).getTime() : null;
  const expiresAt = new Date(payload.expires_at).getTime();
  if (renewalAfter && now < renewalAfter) {
    return;
  } // not in renewal window yet
  if (now >= expiresAt) {
    // Already expired — try anyway; some clock-skew/last-mile failure
    // might be the reason and the wallet may still accept the request.
    logger.warn(`[license] attempting renewal of already-expired license (expired_at=${payload.expires_at})`);
  }
  try {
    const result = await licenseService.renewOnline();
    logger.info(`[license] auto-renewed serial=${result.payload.serial} new_expires=${result.payload.expires_at}`);
  } catch (err) {
    logger.error(`[license] auto-renew failed: ${err.message}`, err);
  }
}

function registerLicenseJobs() {
  registerJob({
    name: 'license-renew',
    cronTime: '0 * * * *', // top of every hour
    run: tryRenew,
    enabled: isAutoRenewEnabled(),
    skipReason: 'LICENSE_AUTO_RENEW=false'
  });

  registerJob({
    name: 'license-wallclock-bump',
    cronTime: '*/5 * * * *',
    run: () => {
      licenseSeal.bumpWallclock();
    }
  });
}

module.exports = { registerLicenseJobs };
