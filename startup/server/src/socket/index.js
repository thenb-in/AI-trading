// Public surface of the socket lib.
//
// Boot calls available to apps:
//   initAppServerRunnerClient — outbound link to the report runner
//   initClientAppServerSocket — inbound socket.io for browser clients
//
// Loading this module also triggers init_setup, which validates the app's
// registeredReports declaration and queues the 'report:run' handler.
// Runner inbound socket (initRunnerSocket) lives in report_runner/.

require('./init_setup');

const { initClientAppServerSocket } = require('./client_appserver');
const { initAppServerRunnerClient } = require('./appserver_runner');

module.exports = {
  initAppServerRunnerClient,
  initClientAppServerSocket
};
