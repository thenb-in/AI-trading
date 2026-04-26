const logger = require('../../logger');

/**
 * HTTP request/response logging middleware. Logs incoming requests and response outcomes
 * with timing information. Skips noisy endpoints (/health, /favicon.ico).
 * Avoids logging request body for GET/DELETE methods.
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 */
const httpLogger = (req, res, next) => {
  // Skip logging for health checks or other noisy endpoints
  if (req.path === '/health' || req.path === '/favicon.ico') {
    return next();
  }

  const start = Date.now();
  const { method, originalUrl, ip, params, query, body } = req;

  // Log the incoming request
  const logData = {
    method,
    path: originalUrl,
    ip,
    ...(Object.keys(params).length && { params }),
    ...(Object.keys(query).length && { query }),
    // Be careful with logging sensitive data in body
    ...(method !== 'GET' && method !== 'DELETE' && { body })
  };
  logger.info(`[HTTP] ${logData.method} ${logData.path} from ${logData.ip}`);

  // Capture response finish to log the outcome
  res.on('finish', () => {
    const duration = Date.now() - start;
    const contentLength = res.get('content-length');

    logger.info(`${method} ${originalUrl} ${contentLength} ${res.statusCode} ${duration}ms`);
  });

  next();
};

module.exports = httpLogger;
