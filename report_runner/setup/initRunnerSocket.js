// Inbound socket.io: app server connects here; report:run runs via reportRunHandler.

const { createSocketServer } = require('@startup/src/socket/utils/createSocketServer');
const { registerRpcHandler } = require('@startup/src/socket/utils/rpc');
const { REPORT_RUN } = require('@startup/src/constants/socketEvent');
const { handleReportRun } = require('./reportRunHandler');

function initRunnerSocket({ httpServer, label = 'report-runner' }) {
  const io = createSocketServer({ httpServer, corsOrigin: '*', label });
  registerRpcHandler(io, REPORT_RUN, handleReportRun, { label });
  return io;
}

module.exports = { initRunnerSocket };
