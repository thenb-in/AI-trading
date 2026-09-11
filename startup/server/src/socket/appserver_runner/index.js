// App server → report runner outbound socket client.

const jwt = require('jsonwebtoken');
const env = require('@startup/src/config/env');
const { createSocketClient } = require('../utils/createSocketClient');
const { createInProcessRunnerClient } = require('./inProcessRunner');

let _appServerRunnerClient = null;

function makeServiceToken() {
  return jwt.sign(
    { id: 'app-server', company_id: null, svc: true },
    env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

/**
 * Initialise the persistent outbound socket from the app server to the
 * runner. Idempotent — subsequent calls return the existing client.
 */
function initAppServerRunnerClient() {
  if (_appServerRunnerClient) {
    return _appServerRunnerClient;
  }

  // No runner URL means no separate process to offload to, so run reports in
  // the app server itself. Same isConnected()/request() surface either way, so
  // the handlers and the saved-run lifecycle never learn which mode is live.
  const url = env.REPORT_RUNNER_URL;
  if (!url) {
    _appServerRunnerClient = createInProcessRunnerClient();
    return _appServerRunnerClient;
  }
  _appServerRunnerClient = createSocketClient({
    url,
    label: 'app->report-runner',
    getToken: makeServiceToken
  });
  return _appServerRunnerClient;
}

function getAppServerRunnerClient() {
  if (!_appServerRunnerClient) {
    initAppServerRunnerClient();
  }
  return _appServerRunnerClient;
}

module.exports = {
  initAppServerRunnerClient,
  getAppServerRunnerClient
};
