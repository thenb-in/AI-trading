// Server-side handler for the 'report:run' RPC on the client→app-server channel.
//
// Strict runner-only path: if the runner is down or the RPC fails, surface
// the error to the client. Local execution stays available via the regular
// HTTP Apply button — the runner button is opt-in, so we don't silently
// double-bill it as a "fallback" here.

const logger = require('@startup/logger');
const { getAppServerRunnerClient } = require('../../appserver_runner');
const { registerSocketHandler } = require('../../client_appserver');
const { REPORT_RUN } = require('../../../constants/socketEvent');

async function handleReportRun(payload, socket) {
  const { reportKey, filters } = payload || {};
  if (!reportKey) {
    throw new Error(`[report:run] reportKey is required in payload: ${Object.keys(payload)}`);
  }
  if (!socket.user) {
    throw new Error(`[report:run] unauthenticated socket id=${socket.id}`);
  }

  const user = socket.user;
  const rpcPayload = { reportKey, filters, user };

  const runner = getAppServerRunnerClient();
  if (!runner.isConnected()) {
    throw new Error(`REPORT_RUNNER_UNAVAILABLE: runner is not connected; use HTTP Apply instead ${reportKey}`);
  }

  const data = await runner.request(REPORT_RUN, rpcPayload);
  logger.info(`[report:run] served via report_runner key=${reportKey} company=${user.company_id}`);
  return { source: 'report_runner', data };
}

registerSocketHandler(REPORT_RUN, handleReportRun);
