// Generic socket.io server bootstrap.

const { Server } = require('socket.io');
const logger = require('../../../logger');
const { buildSocketAuthMiddleware } = require('../../middleware/socketAuthMiddleware');


function createSocketServer({ httpServer, corsOrigin = '*', onReady, label = 'socket', allowAnonymous = false }) {
  const io = new Server(httpServer, {
    cors: { origin: corsOrigin, credentials: true }
  });

  io.use(buildSocketAuthMiddleware({ allowAnonymous }));

  io.on('connection', (socket) => {
    const who = socket.user ? `user=${socket.user.id} company=${socket.user.company_id}` : 'anon';
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
