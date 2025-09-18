const logger = require('../logger');

const errorMiddleware = (err, req, res, _next) => {
  logger.error(err.stack);
  res.status(500).json({ error: 'Something went wrong' });
};

module.exports = errorMiddleware;
