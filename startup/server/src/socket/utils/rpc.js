const logger = require('../../../logger');

/**
 * Register an RPC handler on every incoming connection.
 */

function registerRpcHandler(io, event, handler, opts = {}) {
  const { label = 'rpc' } = opts;
  io.on('connection', (socket) => {
    socket.on(event, async (payload, ack) => {
      const safeAck = typeof ack === 'function' ? ack : () => {};
      try {
        const data = await handler(payload, socket);
        safeAck({ ok: true, data });
      } catch (err) {
        logger.error(`[${label}] handler "${event}" failed: ${err.message}`,err);
        safeAck({ ok: false, error: err.message || 'INTERNAL_ERROR' });
      }
    });
  });
}

module.exports = { registerRpcHandler };
