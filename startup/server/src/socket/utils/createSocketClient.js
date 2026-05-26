// Generic outbound socket.io-client wrapper.
//
// Used by the app server to connect to the report runner as a persistent
// client. Adds JWT auth on the handshake, exposes a `request(event, payload)`
// helper for request/response RPC via socket.io's ack callback, and tracks
// connection state so the caller can decide whether to fall back to a local
// path when the link is down.

const { io: ioClient } = require('socket.io-client');
const logger = require('../../../logger');


function createSocketClient({ url, getToken, label = 'socket-client' }) {
  const socket = ioClient(url, {
    auth: (cb) => cb({ token: typeof getToken === 'function' ? getToken() : undefined }),
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    transports: ['websocket']
  });

  socket.on('connect', () => logger.info(`[${label}] connected to ${url} id=${socket.id}`));
  socket.on('disconnect', (reason) => logger.warn(`[${label}] disconnected from ${url}: ${reason}`));
  socket.on('connect_error', (err) => logger.warn(`[${label}] connect_error: ${err.message}`));

  function isConnected() {
    return socket.connected === true;
  }

  /**
   * Request/response via socket.io ack. Resolves with the payload acked by
   * the remote handler. Rejects only if the link is down (SOCKET_NOT_CONNECTED)
   * or the remote signals { ok: false, error }. No client-side timeout — long
   * reports are allowed to run as long as the remote needs.
   */
  function request(event, payload) {
    return new Promise((resolve, reject) => {
      if (!socket.connected) {
        return reject(new Error(`[${label}] SOCKET_NOT_CONNECTED event=${event} url=${url}`));
      }
      socket.emit(event, payload, (response) => {
        if (!response || response.ok !== true) {
          const msg = response?.error || 'SOCKET_RPC_ERROR';
          return reject(new Error(`[${label}] ${msg} event=${event}`));
        }
        resolve(response.data);
      });
    });
  }

  function close() {
    try {
      socket.close();
    } catch {
      // already closed
    }
  }

  return { socket, isConnected, request, close };
}

module.exports = { createSocketClient };
