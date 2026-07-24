'use strict';
const { loadAndVerify } = require('./verify');
const { licensedPermissionNames } = require('../core/licenseUtils');

/**
 * True only if the active license whitelists `permissionName`.
 * bypass (dev mode) means all; a missing/invalid license means none.
 */
async function hasLicensedPermission(permissionName) {
  const state = await loadAndVerify();
  if (state.bypass) {
    return true;
  }
  if (!state.ok) {
    return false;
  }
  const allowed = licensedPermissionNames(state.payload);
  return allowed.includes(permissionName);
}

/** Whitelisted permission names, or null when licensing is bypassed (all allowed). */
async function getLicensedPermissions() {
  const state = await loadAndVerify();
  if (state.bypass) {
    return null;
  }
  if (!state.ok) {
    return [];
  }
  return licensedPermissionNames(state.payload);
}

module.exports = {
  hasLicensedPermission,
  getLicensedPermissions
};
