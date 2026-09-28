// Socket.io room-name helpers. Keep join-side and emit-side in sync by routing
// both through these functions instead of hand-built strings.

/**
 * Per-tenant room. Every authenticated browser/agent socket joins its own
 * company room on connect, so server-side broadcasts can target a single
 * company instead of every connected client.
 */
function companyRoom(companyId) {
  return `company:${companyId}`;
}


function userRoom(userId) {
  return `user:${userId}`;
}

/** Per-login-session room, so one signed-in device can be reached (or cut off) on its own. */
function sessionRoom(sessionId) {
  return `session:${sessionId}`;
}

module.exports = { companyRoom, userRoom, sessionRoom };
