// Browser / React client → app server socket channel (inbound, server side).

const env = require('@startup/src/config/env');
const { createSocketServer } = require('../utils/createSocketServer');
const { registerRpcHandler } = require('../utils/rpc');

// Handlers registered before init; each entry is { event, handler }.
const _handlers = [];

// The live socket.io server instance, set on init. Exposed via getAppServerIo()
// so server-side code (e.g. ingestion) can broadcast events to browser clients
// and connected agents.
let _io = null;

/**
 * Queue an RPC handler for the client→app-server channel
 */
function registerSocketHandler(event, handler) {
  _handlers.push({ event, handler });
}

/**
 * The live app-server socket.io instance, or null before init / outside a
 * server context. Callers must null-check.
 */
function getAppServerIo() {
  return _io;
}

/**
 * Attach socket.io to the app HTTP server and wire every queued handler.
 */
function initClientAppServerSocket(httpServer) {
  const label = 'app-server';
  // FRONTEND_URL must be explicit — no implicit wildcard, since the socket
  // server runs with credentials and an unbound origin would be a CORS hole.
  if (!env.FRONTEND_URL) {
    throw new Error(`[socket] FRONTEND_URL: ${env.FRONTEND_URL} is required to start the browser-facing socket server`);
  }
  const io = createSocketServer({
    httpServer,
    corsOrigin: env.FRONTEND_URL,
    label
  });
  for (const { event, handler } of _handlers) {
    registerRpcHandler(io, event, handler, { label });
  }
  _io = io;
  return io;
}

module.exports = { registerSocketHandler, initClientAppServerSocket, getAppServerIo };
