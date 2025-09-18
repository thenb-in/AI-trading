const winston = require('winston');
require('winston-daily-rotate-file');

// check if env is production
const isProduction = process.env.NODE_ENV === 'production';
// Create timestamp format - should be dd-mm-yyyy hh:mm:ss
const tsFormat = () => {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'short',
    timeStyle: 'medium'
  }).format(new Date());
};


// create a function which takes in name of log and returns winston transport
const getTransport = (logName) => {
  return new winston.transports.DailyRotateFile({
    filename: `logs/${logName}-%DATE%.log`,  // Log file name pattern
    datePattern: 'YYYY-MM-DD',               // Rotate logs daily
    zippedArchive: true,                     // Compress logs after rotation
    maxSize: '5m',                           // Maximum size of a log file before rotation
    maxFiles: '14d',                         // Retain logs for 14 days
    handleExceptions: true,                  // Handle exceptions
    handleRejections: true                  // Handle rejections
  });
};

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

// set up logging
const logger = winston.createLogger({
  level: isProduction ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.errors({stack: true}), // <-- use errors format
    // use timestamp format
    winston.format.timestamp({ format: tsFormat }),
    // colorise if not in production
    !isProduction ? winston.format.colorize({ all: true }) : winston.format.uncolorize(),
    winston.format.printf(info => {
      return `${info.timestamp} ${info.level}: ${info.message}`;
    })
  ),
  defaultMeta: { service: 'user-service' },
  transports: [
    new winston.transports.Console({}), // Log to console
    getTransport('app')              // Add Daily Rotate File transport
  ],
  exceptionHandlers: [
    new winston.transports.Console(),
    getTransport('exceptions')       // Add Daily Rotate File transport for exceptions;
  ],
  exitOnError: false // do not exit on handled exceptions
});


// Override console methods
console.log = (...args) => {
  logger.info(args.map(arg => (typeof arg === 'object' ? JSON.stringify(arg) : arg)).join(' '));
};

// Helper function to determine if it's an error or an exception
// todo: check if this can be used to differentiate between errors and exceptions
const isCriticalError = (err) => {
  return err instanceof SyntaxError || err instanceof ReferenceError || err instanceof TypeError;
};

console.error = (...args) => {
  logger.error(args.map(arg => (typeof arg === 'object' ? JSON.stringify(arg) : arg)).join(' '));
};


console.warn = (...args) => {
  logger.warn(args.map(arg => (typeof arg === 'object' ? JSON.stringify(arg) : arg)).join(' '));
};

module.exports = logger;
