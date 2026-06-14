// Close socket + HTTP on SIGTERM/SIGINT; force exit after 5s if hang.

const logger = require('@startup/logger');

const SHUTDOWN_TIMEOUT_MS = 5000;

function registerShutdown({ io, httpServer }) {
  function shutdown(signal) {
    logger.info(`[report-runner] ${signal} received, closing`);
    try { io.close(); } catch { /* noop */ }
    httpServer.close(() => process.exit(0));
    setTimeout(() => process.exit(1), SHUTDOWN_TIMEOUT_MS).unref();
  }
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

module.exports = { registerShutdown };
