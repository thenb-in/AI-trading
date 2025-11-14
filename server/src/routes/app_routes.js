// app_routes.js

const logger = require('../../logger');
const env = require('../config/env');

// export a function that takes in app and returns the app with the routes
const appRoutes = (app, prefix) => {
  // todo: should protect these routes with auth middleware?

  // todo: automatically add prefix to app routes
  // current routes in app route need to manually add prefix
  // Health check endpoint
  app.get(`${prefix}/health`, (req, res) => {
    logger.info(`2. Health check endpoint called: ${req.url}`);
    const healthData = {
      message: 'NB Next Server is running',
      status: 'OK',
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
      version: '2.0.0',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      pid: process.pid
    };

    const healthIp = req.ip || req.connection.remoteAddress;
    const healthUserAgent = req.get('User-Agent');
    logger.info(`Health Check: NB Next Server is running ip=${healthIp}, userAgent=${healthUserAgent}`);

    res.json(healthData);
  });

  app.get(`${prefix}/test`, (req, res) => {
    // use req to get the url
    logger.info(`Request received for ${req.url}`);
    res.send('Custom implementation of the app routes');
  });

  // todo: add more app routes here - add all routes that are not in the startup routes
};

module.exports = appRoutes;
