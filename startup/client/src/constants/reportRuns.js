// Saved report runs (Reporting Manager).

const REPORT_RUN_STATUS = {
  QUEUED: 'queued',
  RUNNING: 'running',
  DONE: 'done',
  FAILED: 'failed',
  // Stopped by the person who asked for it — see
  // startup/server/src/constants/reportRuns.js.
  CANCELLED: 'cancelled'
};

const REPORT_RUN_STATUS_STYLE = {
  [REPORT_RUN_STATUS.QUEUED]: 'bg-gray-100 text-gray-700',
  [REPORT_RUN_STATUS.RUNNING]: 'bg-blue-100 text-blue-700',
  [REPORT_RUN_STATUS.DONE]: 'bg-green-100 text-green-700',
  [REPORT_RUN_STATUS.FAILED]: 'bg-red-100 text-red-700',
  // Amber, not red: a stopped run is not an error to be alarmed by.
  [REPORT_RUN_STATUS.CANCELLED]: 'bg-amber-100 text-amber-700'
};

const REPORTS_ROOT_PATH = '/admin/report';
const REPORTING_MANAGER_PATH = `${REPORTS_ROOT_PATH}/manager`;

// Presence of this search param on a report route means "render this saved run
// instead of computing anything". It keeps saved results in the URL, so they
// survive a refresh and can be handed to someone else. The server builds the
// same link for the "report ready" notification — see
// startup/server/src/constants/reportRuns.js.
const SAVED_RUN_PARAM = 'runId';

// Fired on window when this tab starts a saved run, so the activity strip can
// show it immediately instead of waiting to be told by a poll. Completion
// arrives over the socket, so between the two there is nothing to poll for.
const REPORT_RUN_STARTED_EVENT = 'report-run:started';

// Prefix the server puts on the error it throws when no report runner is
// connected. Keep in step with startup/server/src/constants/reportRuns.js.
// runReportViaSocket turns a match into `error.runnerUnavailable`, so callers
// branch on a flag rather than on message text.
const REPORT_RUNNER_UNAVAILABLE = 'REPORT_RUNNER_UNAVAILABLE';

// Statuses that mean "still working".
const REPORT_RUN_IN_PROGRESS = [REPORT_RUN_STATUS.QUEUED, REPORT_RUN_STATUS.RUNNING];

function savedRunPath(reportKey, runId) {
  return `${REPORTS_ROOT_PATH}/${reportKey}?${SAVED_RUN_PARAM}=${runId}`;
}

export {
  REPORT_RUN_STATUS,
  REPORT_RUN_STATUS_STYLE,
  REPORTS_ROOT_PATH,
  REPORTING_MANAGER_PATH,
  SAVED_RUN_PARAM,
  REPORT_RUN_STARTED_EVENT,
  REPORT_RUNNER_UNAVAILABLE,
  REPORT_RUN_IN_PROGRESS,
  savedRunPath
};
