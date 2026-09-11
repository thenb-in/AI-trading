// Constants internal to the report-run core.
//
// This core runs in two places — the standalone report-runner process and the
// app server itself when no runner URL is configured — so its own constants
// live here alongside it rather than in either process. Anything read from the
// environment stays in the framework's config/env.js.

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

module.exports = { RUN_STOPPED_ERROR, RUN_OUTCOMES };
