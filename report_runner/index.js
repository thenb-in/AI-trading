// Entry: load env + aliases, then start HTTP + socket server.
//
// The app server sends report:run here. It also records every saved run in the
// database before dispatching, so this process can pick up anything left
// unfinished — by its own restart, or because the app server could not reach it
// at the time. Resuming happens once the socket is up, so completions have
// somewhere to be announced.

require('./setup/setupAliases');

const logger = require('@startup/logger');
const { getRunnerConfig } = require('./setup/config');
const { createHttpServer } = require('./setup/createHttpServer');
const { initRunnerSocket } = require('./setup/initRunnerSocket');
const { registerShutdown } = require('./setup/registerShutdown');
const { setAnnouncer } = require('./setup/announceRunFinished');
const { resumePendingRuns } = require('./setup/resumePendingRuns');
const { installQueryTracking } = require('./setup/runCancellation');

const { port, host } = getRunnerConfig();
// Before anything can run a report: it is what lets a report already in the
// database be stopped partway.
installQueryTracking();
const httpServer = createHttpServer();
const io = initRunnerSocket({ httpServer });

setAnnouncer(io);
registerShutdown({ io, httpServer });

httpServer.listen(port, host, () => {
  logger.info(`[report-runner] listening on ${host}:${port}`);
  resumePendingRuns();
});
