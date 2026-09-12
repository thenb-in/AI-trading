// Entry: load env + aliases, then start HTTP + socket server.
//
// The app server sends report:run here. It also records every saved run in the
// database before dispatching, so this process can pick up anything left
// unfinished — by its own restart, or because the app server could not reach it
// at the time. Resuming happens once the socket is up, so completions have
// somewhere to be announced.

require('./setup/setupAliases');
// eslint-disable-next-line custom/no-direct-model-imports
require('@appServer/src/models/register/registerAppModelFields');
require('@appServer/src/data/registerAppData');

const logger = require('@startup/logger');
const { REPORT_RUN_FINISHED } = require('@startup/src/constants/socketEvent');
const { setAnnouncer } = require('@startup/src/socket/init_setup/reports/runner/runAnnouncer');
const { resumePendingRuns } = require('@startup/src/socket/init_setup/reports/runner/resumePendingRuns');
const { installQueryTracking } = require('@startup/src/socket/init_setup/reports/runner/runCancellation');
const { getRunnerConfig } = require('./setup/config');
const { createHttpServer } = require('./setup/createHttpServer');
const { initRunnerSocket } = require('./setup/initRunnerSocket');
const { registerShutdown } = require('./setup/registerShutdown');

const { port, host } = getRunnerConfig();
// Before anything can run a report: it is what lets a report already in the
// database be stopped partway.
installQueryTracking();
const httpServer = createHttpServer();
const io = initRunnerSocket({ httpServer });

// This process reaches the app server over the socket, so its announcer emits
// the finished-run event for the app server to pick up and notify on.
setAnnouncer((payload) => io.emit(REPORT_RUN_FINISHED, payload));
registerShutdown({ io, httpServer });

httpServer.listen(port, host, () => {
  logger.info(`[report-runner] listening on ${host}:${port}`);
  resumePendingRuns();
});
