'use strict';
const env = require('../../../config/env');
const { DEFAULT_CLOCK_SKEW_SECONDS } = require('../../../constants/license');
const { toEpochMs } = require('../../../utils/dateUtils');

// Pure, stateless helpers over a license payload / env. No I/O, no async.

// Allowed clock skew for a token, in milliseconds.
function clockSkewMs(payload) {
  return (payload.max_clock_skew_seconds || DEFAULT_CLOCK_SKEW_SECONDS) * 1000;
}

// Absolute ms instant after which a token counts as expired (skew included).
function expiryDeadlineMs(payload) {
  return toEpochMs(payload.expires_at) + clockSkewMs(payload);
}

// The app identity this install accepts licenses for. The wallet stamps the
// APP_KEY into the token's `app_name` field, so we match against APP_KEY.
function expectedAppName() {
  return env.APP_KEY;
}

// Flattened, de-duped set of permission names granted by every plan in the
// token. A permission may be a plain name (older tokens) or an object
// { name, ... } (current tokens).
function licensedPermissionNames(payload) {
  const names = [];
  for (const plan of Array.isArray(payload?.plan) ? payload.plan : []) {
    for (const perm of Array.isArray(plan.permissions) ? plan.permissions : []) {
      const name = typeof perm === 'string' ? perm : perm?.name;
      if (name && !names.includes(name)) {
        names.push(name);
      }
    }
  }
  return names;
}

module.exports = {
  clockSkewMs,
  expiryDeadlineMs,
  expectedAppName,
  licensedPermissionNames
};
