// Report run (Reporting Manager) constants.

const REPORT_RUN_STATUS = {
  QUEUED: 'queued',
  RUNNING: 'running',
  DONE: 'done',
  FAILED: 'failed',
  // Stopped by the person who asked for it. Terminal, and distinct from failed:
  // nothing went wrong, so it is not worth a "your report failed" notification
  // and not worth retrying on its own.
  CANCELLED: 'cancelled'
};

// The statuses a run can still be stopped from. Also the ones a worker may hold,
// which is why cancelling writes over exactly these two and nothing else — a run
// that already finished keeps its result.
const REPORT_RUN_ACTIVE_STATUSES = [REPORT_RUN_STATUS.QUEUED, REPORT_RUN_STATUS.RUNNING];

// Who asked for the run. Only FRONTEND is written today; scheduled reports
// will write CRON without a schema change.
const REPORT_RUN_SOURCE = {
  FRONTEND: 'frontend',
  CRON: 'cron'
};

// Sub-directory under UPLOADS_DIR that holds the gzipped payloads. The files
// are registered in NBnext Drive; this is only where the bytes land.
const REPORT_RUN_PAYLOAD_DIR = 'report_runs';

const REPORT_RUN_PAYLOAD_MIME = 'application/gzip';

// Drive's objectName for a payload, so a file can be traced back to its run
// (and found from the Drive side via getFilesByObject).
const REPORT_RUN_DRIVE_OBJECT = 'ReportRun';

// Nightly purge horizon. A run older than this is of no use to anyone — its
// underlying attendance/salary data has moved on — and its payload file is the
// single largest thing this feature puts on disk.
const REPORT_RUN_RETENTION_DAYS = 15;

// Page size for the Reporting Manager list.
const REPORT_RUN_LIST_LIMIT = 100;

const REPORT_RUN_LOG_PREFIX = '[report-run]';

// Prefixed onto the error thrown when a report is asked for with no runner
// connected. Callers that poll in the background (the punch reminder) match on
// it to tell "nothing to check right now" apart from a real failure — see
// startup/client/src/constants/reportRuns.js.
const REPORT_RUNNER_UNAVAILABLE = 'REPORT_RUNNER_UNAVAILABLE';

// Client route a finished run links back to: the report itself, opened on the
// saved result. `?runId=` is what tells the report page to load rather than
// recompute — sending the user to a list to hunt for their own report would
// waste the click the notification just earned.
const REPORTS_ROOT_PATH = '/admin/report';
const SAVED_RUN_PARAM = 'runId';

// Thrown at any query a stopped run tries to open. It travels out through the
// report exactly like a database error would, which is how a report that was
// never written to be interruptible ends up unwinding anyway.
const RUN_STOPPED_ERROR = 'REPORT_RUN_STOPPED: this run was stopped';

// How a run ended, as counted by /metrics. A run that was stopped is counted
// apart from one that failed: it says how often people give up on a report,
// which is a fact about the report, while errors are a fact about the code.
const RUN_OUTCOMES = {
  SUCCESSES: 'successes',
  ERRORS: 'errors',
  CANCELLATIONS: 'cancellations'
};

function reportPath(reportKey) {
  return `${REPORTS_ROOT_PATH}/${reportKey}`;
}

function savedRunPath(reportKey, runId) {
  return `${reportPath(reportKey)}?${SAVED_RUN_PARAM}=${runId}`;
}

module.exports = {
  REPORT_RUN_STATUS,
  REPORT_RUN_ACTIVE_STATUSES,
  REPORT_RUN_SOURCE,
  REPORT_RUN_PAYLOAD_DIR,
  REPORT_RUN_PAYLOAD_MIME,
  REPORT_RUN_DRIVE_OBJECT,
  REPORT_RUN_RETENTION_DAYS,
  REPORT_RUN_LIST_LIMIT,
  REPORT_RUN_LOG_PREFIX,
  REPORT_RUNNER_UNAVAILABLE,
  RUN_STOPPED_ERROR,
  RUN_OUTCOMES,
  REPORTS_ROOT_PATH,
  SAVED_RUN_PARAM,
  reportPath,
  savedRunPath
};
