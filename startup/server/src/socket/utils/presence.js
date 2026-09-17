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
const { userRoom } = require('./rooms');

/** "Chrome on Windows" / "Safari on iPhone" — enough to recognise a device by. */
function describeDevice(userAgent) {
  if (!userAgent) {
    return 'Unknown device';
  }
  const browser = ['Edg', 'Chrome', 'Firefox', 'Safari'].find((name) => userAgent.includes(name));
  const platform = ['iPhone', 'iPad', 'Android', 'Windows', 'Mac', 'Linux'].find((name) => userAgent.includes(name));
  return [browser === 'Edg' ? 'Edge' : browser, platform].filter(Boolean).join(' on ') || userAgent.slice(0, 40);
}

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

module.exports = { connectionsByUser, disconnectUser };
