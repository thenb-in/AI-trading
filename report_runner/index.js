// Entry: load env + aliases, then start HTTP + socket server.
// App server sends report:run here; if down, app runs reports locally.

require('./setup/setupAliases');

const logger = require('@startup/logger');
const reportRegistry = require('@startup/src/socket/init_setup/reports/registry');
const reportRoutes = require('@appServer/src/routes/reportRoutes');
const { getRunnerConfig } = require('./setup/config');
const { createHttpServer } = require('./setup/createHttpServer');
const { initRunnerSocket } = require('./setup/initRunnerSocket');
const { registerShutdown } = require('./setup/registerShutdown');

// Initialise the report registry from the app's routes. The runner is a
// top-level process that legitimately composes both @startup and @appServer
// (aliases wired in setup/setupAliases), so injecting here keeps the registry
// itself free of any app/ dependency.
reportRegistry.init(reportRoutes);

const { port, host } = getRunnerConfig();
const httpServer = createHttpServer();
const io = initRunnerSocket({ httpServer });

registerShutdown({ io, httpServer });

httpServer.listen(port, host, () => {
  logger.info(`[report-runner] listening on ${host}:${port}`);
});
