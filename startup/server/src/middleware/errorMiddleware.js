const logger = require('../../logger');

/**
 * Centralized error-handling middleware. Catches all errors that reach the end of the
 * middleware chain and sends a structured JSON response. Includes stack trace in development only.
 * @param {Error} err - The error object
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} _next - Next middleware (unused but required by Express error handler signature)
 */
const errorMiddleware = (err, req, res, _next) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Something went wrong';

  logger.error(`Error middleware error ${message}`);

  // Ensure status is a valid integer
  const validStatus = Number.isInteger(status) ? status : 500;

  res.status(validStatus).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorMiddleware;
