// Who is connected to this app server right now.
//
// The socket server already knows: every authenticated browser socket carries
// the user it was opened by and joins that user's room. This reads that back so
// the user screen can show live sessions, and drops them when an administrator
// signs someone out.
//
// Presence is the live half of a session; the durable half (a refresh token
// that can wake a signed-out tab back up) lives on the user row.

const { getAppServerIo } = require('../client_appserver');
const { userRoom, sessionRoom } = require('./rooms');
const { onUserDeactivate } = require('../../hooks/onUserDeactivate');
const { describeDevice } = require('../../utils/describeDevice');

/**
 * Live connections per user id, for one company.
 * @returns {Map<string, {label: string, ip: string, since: string}[]>}
 */
function connectionsByUser(companyId) {
  const io = getAppServerIo();
  const byUser = new Map();
  if (!io) {
    return byUser;
  }
  for (const socket of io.sockets.sockets.values()) {
    const user = socket.user;
    if (!user?.id || String(user.company_id) !== String(companyId)) {
      continue;
    }
    const key = String(user.id);
    const connections = byUser.get(key) || [];
    connections.push({
      label: describeDevice(socket.handshake.headers['user-agent']),
      ip: socket.handshake.address,
      since: new Date(socket.handshake.issued).toISOString()
    });
    byUser.set(key, connections);
  }
  return byUser;
}

/** Drops every live connection the user has, so a signed-out tab stops updating too. */
function disconnectUser(userId) {
  const io = getAppServerIo();
  if (!io) {
    return;
  }
  io.in(userRoom(userId)).disconnectSockets(true);
}

/** Drops the live connections of one login session, so a device signed out on its own goes quiet too. */
function disconnectSession(sessionId) {
  const io = getAppServerIo();
  if (!io) {
    return;
  }
  io.in(sessionRoom(sessionId)).disconnectSockets(true);
}

// A deactivated user is signed out everywhere at once, like an administrator's sign-out.
onUserDeactivate(disconnectUser);

module.exports = { connectionsByUser, disconnectUser, disconnectSession };
