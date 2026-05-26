// App server → report runner outbound socket client.

const jwt = require('jsonwebtoken');
const env = require('@startup/src/config/env');
const logger = require('../../../logger');
const { createSocketClient } = require('../utils/createSocketClient');

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

  const url = env.REPORT_RUNNER_URL;
  if (!url) {
    logger.warn(`[app->runner] REPORT_RUNNER_URL not set (value=${url}) — runner disabled, fallback only`);
    _appServerRunnerClient = {
      isConnected: () => false,
      request: () => Promise.reject(new Error(`REPORT_RUNNER_URL not configured (value=${url})`)),
      close: () => {}
    };
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
