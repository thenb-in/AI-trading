// Generic socket primitives shared across both channels.
//(browser ↔ app server, or
// app server ↔ runner)

const { createSocketServer } = require('./createSocketServer');
const { createSocketClient } = require('./createSocketClient');
const { registerRpcHandler } = require('./rpc');

module.exports = {
  createSocketServer,
  createSocketClient,
  registerRpcHandler
};
