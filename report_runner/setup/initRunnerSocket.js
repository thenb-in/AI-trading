// Inbound socket.io: app server connects here; report:run runs via
// reportRunHandler and report:run:cancel stops one it is already working on.

const { createSocketServer } = require('@startup/src/socket/utils/createSocketServer');
const { registerRpcHandler } = require('@startup/src/socket/utils/rpc');
const { REPORT_RUN, REPORT_RUN_CANCEL } = require('@startup/src/constants/socketEvent');
const { handleReportRun, handleReportCancel } = require('@startup/src/socket/init_setup/reports/runner/reportExecutor');

function initRunnerSocket({ httpServer, label = 'report-runner' }) {
  const io = createSocketServer({ httpServer, corsOrigin: '*', label });
  registerRpcHandler(io, REPORT_RUN, handleReportRun, { label });
  registerRpcHandler(io, REPORT_RUN_CANCEL, handleReportCancel, { label });
  return io;
}

module.exports = { initRunnerSocket };
