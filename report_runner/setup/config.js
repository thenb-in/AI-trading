// Port and bind host for this process (REPORT_RUNNER_PORT / REPORT_RUNNER_HOST).

function getRunnerConfig() {
  return {
    port: Number(process.env.REPORT_RUNNER_PORT || 4001),
    host: process.env.REPORT_RUNNER_HOST || '0.0.0.0',
  };
}

module.exports = { getRunnerConfig };
