// Close socket + HTTP on SIGTERM/SIGINT; force exit if the close hangs.

const logger = require('@startup/logger');
const { SHUTDOWN_TIMEOUT_MS } = require('../constants');

function registerShutdown({ io, httpServer }) {
  function shutdown(signal) {
    logger.info(`[report-runner] ${signal} received, closing`);
    try {
      io.close();
    } catch {
      // Already closed, or never opened — either way we are on our way out.
    }
    // Exiting is the point of a shutdown handler, so the no-process-exit rule
    // (which exists to stop libraries killing the process) is disabled here.
    httpServer.close(() => process.exit(0)); // eslint-disable-line no-process-exit
    setTimeout(() => process.exit(1), SHUTDOWN_TIMEOUT_MS).unref(); // eslint-disable-line no-process-exit
  }
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

module.exports = { registerShutdown };
