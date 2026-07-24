const { VALID_SUBSCRIPTION_STATUSES, DEFAULT_SUBSCRIPTION_STATUS } = require('../../constants/subscription');

/**
 * Validate + de-dupe an incoming `permissions` array of `{ permission_id, status }`.
 * With `dropDefault: true` the implicit-default 'not_subscribed' entries are dropped
 * (used by create, where no rows exist yet); otherwise they are kept so an explicit
 * downgrade to 'not_subscribed' is persisted (used by the patch-style update).
 * Throws `{ status, message }` on bad input; returns `[{ permission_id, status }]`.
 */
function normalizePermissionRows(permissions, { dropDefault = false } = {}) {
  if (!permissions) {
    return [];
  }
  if (!Array.isArray(permissions)) {
    throw { status: 400, message: 'permissions must be an array' };
  }
  const byId = new Map();
  for (const entry of permissions) {
    const permission_id = Number(entry?.permission_id);
    const status = entry?.status;
    if (!Number.isInteger(permission_id)) {
      throw { status: 400, message: 'Each permission requires a numeric permission_id' };
    }
    if (!VALID_SUBSCRIPTION_STATUSES.includes(status)) {
      throw { status: 400, message: `Invalid status "${status}". Must be one of: ${VALID_SUBSCRIPTION_STATUSES.join(', ')}` };
    }
    if (dropDefault && status === DEFAULT_SUBSCRIPTION_STATUS) {
      continue; // no row needed for a fresh subscription
    }
    byId.set(permission_id, status); // last write wins on duplicate ids
  }
  return Array.from(byId.entries()).map(([permission_id, status]) => ({ permission_id, status }));
}

module.exports = {
  normalizePermissionRows
};
