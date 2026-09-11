// Runner configuration.
//
// The values come from the framework's config/env.js — the same module the app
// server reads, and the one this process already loads for UPLOADS_DIR and the
// database. REPORT_RUNNER_PORT and REPORT_RUNNER_HOST are declared there because
// both sides have to agree on them: the app server dials the runner at the
// address the runner binds. A copy here would be a second source of truth for
// one fact, free to drift.

const env = require('@startup/src/config/env');

function getRunnerConfig() {
  return {
    port: env.REPORT_RUNNER_PORT,
    host: env.REPORT_RUNNER_HOST,
    concurrency: env.REPORT_RUNNER_CONCURRENCY
  };
}

module.exports = { getRunnerConfig };
