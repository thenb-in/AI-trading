// Generic socket.io server bootstrap.

const { Server } = require('socket.io');
const logger = require('../../../logger');
const { buildSocketAuthMiddleware } = require('../../middleware/socketAuthMiddleware');
const { companyRoom, userRoom, sessionRoom } = require('./rooms');


function createSocketServer({ httpServer, corsOrigin = '*', onReady, label = 'socket', allowAnonymous = false }) {
  const io = new Server(httpServer, {
    cors: { origin: corsOrigin, credentials: true }
  });

  io.use(buildSocketAuthMiddleware({ allowAnonymous }));

  io.on('connection', (socket) => {
    const who = socket.user ? `user=${socket.user.id} company=${socket.user.company_id}` : 'anon';
    // Join the tenant room so server-side broadcasts can target one company.
    if (socket.user?.company_id) {
      socket.join(companyRoom(socket.user.company_id));
    }
    // Join a per-user room so we can target a single user (e.g. notifications).
    if (socket.user?.id) {
      socket.join(userRoom(socket.user.id));
    }
    // And a per-session room, so signing one device out cuts only that device's tabs.
    if (socket.user?.sid) {
      socket.join(sessionRoom(socket.user.sid));
    }
    logger.info(`[${label}] socket connected id=${socket.id} ${who}`);
    socket.on('disconnect', (reason) => {
      logger.info(`[${label}] socket disconnected id=${socket.id} reason=${reason}`);
    });
  });

  if (typeof onReady === 'function') {
    onReady(io);
  }
  return io;
}

module.exports = { createSocketServer };
