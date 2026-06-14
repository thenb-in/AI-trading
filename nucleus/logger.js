const winston = require('winston');
require('winston-daily-rotate-file');

// Duck-type Sequelize validation errors by name so `nucleus` carries no
// dependency on sequelize (keeps this layer foundational and import-light).
const isSequelizeValidationError = (e) =>
  e && (e.name === 'SequelizeValidationError' || e.name === 'SequelizeUniqueConstraintError') && Array.isArray(e.errors);


const { combine, timestamp, printf, colorize, json } = winston.format;

// check if env is production
const isProduction = process.env.NODE_ENV === 'production';
const DEFAULT_LOG_LEVEL = isProduction ? 'info' : 'debug';

// Define different colors for each level.
// Colors make the log message more visible,
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white'
};

// Tell winston that you want to link the colors
// defined above to the severity levels.
winston.addColors(colors);

// Safe JSON stringify to handle circular references
const safeStringify = (obj, indent = 2) => {
  const seen = new WeakSet();
  return JSON.stringify(obj, (key, val) => {
    if (val !== null && typeof val === 'object') {
      if (seen.has(val)) {
        return '[Circular]';
      }
      seen.add(val);
    }
    return val;
  }, indent);
};

// Custom format for console output
const consoleFormat = printf(({ level, message, timestamp, ...meta }) => {
  let logMessage = `${timestamp} [${level}]: ${message}`;

  // Handle error objects and other metadata
  if (Object.keys(meta).length > 0) {
    // If there's an error object, include its stack trace
    if (meta.error && meta.error.stack) {
      logMessage += `\n${meta.error.stack}`;
      delete meta.error;
    }

    // Stringify remaining metadata if any
    if (Object.keys(meta).length > 0) {
      try {
        logMessage += `\n${safeStringify(meta, 2)}`;
      } catch (err) {
        logMessage += `\n[Unable to stringify metadata: ${err.message}]`;
      }
    }
  }

  return logMessage;
});

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || DEFAULT_LOG_LEVEL,
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format((info) => {
      // Only include service if explicitly set
      if (info.service === undefined) {
        delete info.service;
      }
      return info;
    })(),
    json()
  ),
  transports: [
    // Write all logs with level 'error' and below to 'error.log'
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Write all logs with level 'info' and below to 'combined.log'
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// Save the original error method
const originalError = logger.error.bind(logger);

// Override logger.error
logger.error = (message, meta = {}) => {
  // Handle ValidationError before converting to object
  if (isSequelizeValidationError(meta)) {
    // Extract validation error messages
    const validationMessages = `${message} - Validation errors: ${meta.errors && meta.errors.length > 0
      ? meta.errors.map(error => error.message).join(', ')
      : meta.message}`;
    meta = {
      error: {
        message: validationMessages,
        stack: meta.stack,
        validationErrors: meta.errors ? meta.errors.map(err => ({
          message: err.message,
          type: err.type,
          path: err.path,
          value: err.value
        })) : []
      }
    };
  } else if (meta && meta instanceof Error) {
    meta = { error: { message: meta.message, stack: meta.stack } };
  } else if (!meta.error) {
    meta = { error: { message: message } };
  }

  // Add extra context automatically
  const extendedMeta = {
    ...meta,
    timestamp: new Date().toISOString()
  };

  // Call the original Winston method
  return originalError(meta.error.message, extendedMeta);
};

// If we're not in production, also log to console with colors
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: combine(
      colorize(),
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      consoleFormat
    )
  }));
}

// Create a stream object for morgan
logger.stream = {
  write: (message) => {
    logger.info(message.trim());
  }
};

module.exports = logger;
