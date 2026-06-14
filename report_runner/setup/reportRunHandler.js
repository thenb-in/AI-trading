// Handles report:run RPC — validates key, runs registry handler.
// user + company_id come from the RPC payload (real logged-in user), not the service JWT.

const logger = require('@startup/logger');
const registry = require('@startup/src/socket/init_setup/reports/registry');
const metrics = require('./metrics');

async function handleReportRun(payload) {
  const { reportKey, filters, user } = payload || {};
  if (!reportKey) {
    throw new Error('[report-runner] reportKey is required in payload');
  }
  if (!user?.company_id) {
    throw new Error(`[report-runner] user.company_id is required in payload (user=${user ? Object.keys(user).join(',') : 'null'})`);
  }
  if (!registry.has(reportKey)) {
    throw new Error(`[report-runner] UNKNOWN_REPORT_KEY: ${reportKey} (known=${registry.list().join(',')})`);
  }
  metrics.recordStart(reportKey);
  logger.info(`[report-runner] run key=${reportKey} company=${user.company_id}`);
  try {
    const result = await registry.run(reportKey, { filters, user });
    metrics.recordSuccess(reportKey);
    return result;
  } catch (err) {
    metrics.recordError(reportKey);
    throw err;
  }
}

module.exports = { handleReportRun };
