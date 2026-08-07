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

const { initClientAppServerSocket, getAppServerIo } = require('./client_appserver');
const { initAppServerRunnerClient: connectToRunner } = require('./appserver_runner');
const { registerRunnerAnnouncements } = require('./init_setup/reports/runnerAnnouncements');

/**
 * Open the outbound link to the runner and listen for what it announces.
 *
 * Composed here rather than inside the transport: creating the socket is the
 * transport's job, deciding that finished runs become user notifications is not.
 */
function initAppServerRunnerClient() {
  const client = connectToRunner();
  registerRunnerAnnouncements(client);
  return client;
}

module.exports = {
  initAppServerRunnerClient,
  initClientAppServerSocket,
  getAppServerIo
};
