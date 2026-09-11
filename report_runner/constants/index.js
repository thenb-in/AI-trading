// Constants for the report runner process.
//
// Only what is genuinely this process's own and is not configuration. The
// report-run core's own constants (RUN_STOPPED_ERROR, RUN_OUTCOMES) live with
// that core under @startup, since the app server runs it too. Anything read from
// the environment lives in the framework's config/env.js, which this process
// shares with the app server rather than restating.

// How long to wait for a graceful close before forcing the process down.
const SHUTDOWN_TIMEOUT_MS = 5000;

module.exports = { SHUTDOWN_TIMEOUT_MS };
