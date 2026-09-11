// Constants for the report runner process.
//
// Only what is genuinely this process's own and is not configuration. Anything
// read from the environment lives in the framework's config/env.js, which this
// process shares with the app server rather than restating.

// How long to wait for a graceful close before forcing the process down.
const SHUTDOWN_TIMEOUT_MS = 5000;

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

module.exports = { SHUTDOWN_TIMEOUT_MS, RUN_STOPPED_ERROR, RUN_OUTCOMES };
