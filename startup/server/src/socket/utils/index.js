// Generic socket primitives shared across both channels.
//(browser ↔ app server, or
// app server ↔ runner)

const { createSocketServer } = require('./createSocketServer');
const { createSocketClient } = require('./createSocketClient');
const { registerRpcHandler } = require('./rpc');
const { companyRoom, userRoom } = require('./rooms');

module.exports = {
  createSocketServer,
  createSocketClient,
  registerRpcHandler,
  companyRoom,
  userRoom
};
