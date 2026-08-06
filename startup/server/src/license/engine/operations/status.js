'use strict';
const { toIso, daysUntil } = require('../../../utils/clock');
const { loadAndVerify } = require('./verify');
const { licensedPermissionNames } = require('../core/licenseUtils');

async function getStatusSnapshot() {
  const state = await loadAndVerify();
  if (state.bypass) {
    return { ok: true, bypass: true, reason: state.reason };
  }
  if (!state.ok) {
    return { ok: false, reason: state.reason, detail: state };
  }

  const payload = state.payload;
  return {
    ok: true,
    license_id: payload.license_id,
    customer_id: payload.customer_id,
    app_name: payload.app_name,
    serial: payload.serial,
    plan: payload.plan ?? [],
    permissions: licensedPermissionNames(payload),
    issued_at: payload.issued_at,
    not_before: payload.not_before,
    expires_at: payload.expires_at,
    renewal_after: payload.renewal_after,
    renewal_mode: payload.renewal_mode || 'online',
    days_until_expiry: daysUntil(payload.expires_at),
    machine_fingerprint: payload.machine_fingerprint,
    last_verified_at: toIso(state.verifiedAt)
  };
}

module.exports = {
  getStatusSnapshot
};
