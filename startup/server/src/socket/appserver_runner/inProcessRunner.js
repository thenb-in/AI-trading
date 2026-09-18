// The runner, running inside the app server itself.
//
// When REPORT_RUNNER_URL is not set there is no separate process to offload to,
// so the app server plays both roles: it computes reports in-process instead of
// dialing out. This client exposes the same isConnected()/request() surface the
// socket client does, so nothing downstream — report:run, report:run:cancel,
// the saved-run lifecycle — can tell which mode it is in.
//
// The trade-off is deliberate: heavy report CPU runs on the app server's own
// event loop here. That is exactly the single-process deployment REPORT_RUNNER_URL
// being empty asks for; set the URL to move the work back off to a runner.

const logger = require('../../../logger');
const { REPORT_RUN, REPORT_RUN_CANCEL } = require('../../constants/socketEvent');
const { handleReportRun, handleReportCancel } = require('../init_setup/reports/runner/reportExecutor');
const { installQueryTracking } = require('../init_setup/reports/runner/runCancellation');
const { setAnnouncer } = require('../init_setup/reports/runner/runAnnouncer');
const { resumePendingRuns } = require('../init_setup/reports/runner/resumePendingRuns');
const { onRunFinished } = require('../init_setup/reports/runnerAnnouncements');

const HANDLERS = {
  [REPORT_RUN]: handleReportRun,
  [REPORT_RUN_CANCEL]: handleReportCancel
};

function createInProcessRunnerClient() {
  // Everything the standalone runner does at boot, done here instead: install
  // the query hooks a stop relies on, send finished-run announcements straight
  // to the same handler the socket link would have (no socket to cross), and
  // sweep the queue for runs a restart left behind.
  installQueryTracking();
  setAnnouncer(onRunFinished);
  resumePendingRuns();

  // isConnected is always true: there is no link to drop, so a saved run always
  // dispatches now and the queued-forever fallback path never engages.
  function request(event, payload) {
    const handler = HANDLERS[event];
    if (!handler) {
      return Promise.reject(new Error(`[app->runner:in-process] no handler for event=${event}`));
    }
    return Promise.resolve(handler(payload));
  }

  logger.info(`[app->runner] REPORT_RUNNER_URL not set — running reports in-process, handling ${Object.keys(HANDLERS).join(', ')}`);
  return { inProcess: true, isConnected: () => true, request, close: () => {} };
}

module.exports = { createInProcessRunnerClient };
