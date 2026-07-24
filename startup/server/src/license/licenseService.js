'use strict';
const { loadAndVerify, getCurrentState } = require('./engine/operations/verify');
const { hasLicensedPermission, getLicensedPermissions } = require('./engine/operations/permissions');
const { getStatusSnapshot } = require('./engine/operations/status');
const { renewOnline } = require('./engine/operations/renewal');
const { buildAirgapRequest, applyAirgapResponse, installToken } = require('./engine/operations/airgap');
const pinnedKeys = require('./engine/core/pinnedKeys');

/** Test/CLI helper — reset pinned-key state for a clean run. */
function _resetForTest() {
  pinnedKeys._reset();
}

module.exports = {
  loadAndVerify,
  getCurrentState,
  getStatusSnapshot,
  hasLicensedPermission,
  getLicensedPermissions,
  renewOnline,
  buildAirgapRequest,
  applyAirgapResponse,
  installToken,
  _resetForTest
};
