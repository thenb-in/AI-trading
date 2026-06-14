// Entry: load env + aliases, then start HTTP + socket server.
// App server sends report:run here; if down, app runs reports locally.

require('./setup/setupAliases');

const logger = require('@startup/logger');
const { getRunnerConfig } = require('./setup/config');
const { createHttpServer } = require('./setup/createHttpServer');
const { initRunnerSocket } = require('./setup/initRunnerSocket');
const { registerShutdown } = require('./setup/registerShutdown');

const { port, host } = getRunnerConfig();
const httpServer = createHttpServer();
const io = initRunnerSocket({ httpServer });

registerShutdown({ io, httpServer });

httpServer.listen(port, host, () => {
  logger.info(`[report-runner] listening on ${host}:${port}`);
});
