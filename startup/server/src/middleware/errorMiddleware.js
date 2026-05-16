const logger = require('../../logger');

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
