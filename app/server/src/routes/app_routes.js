// app_routes.js
//
// The app's own HTTP routes, mounted by buildApp() under the framework's
// /api/v1 prefix. An app adds a router by requiring it here and calling
// app.use(`${prefix}/<path>`, router) below.
//
// Empty in the reference scaffold apart from the two routers every app gets:
// the report router the socket runner indexes, and the framework's layouts.

const logger = require('@startup/logger');
const reportRoutes = require('../routes/reportRoutes');
const layoutRoutes = require('@startup/src/routes/layoutRoutes');

const appRoutes = (app, prefix) => {
  app.get(`${prefix}/health`, (req, res) => {
    const healthData = {
      message: 'NB Next Server is running',
      status: 'OK',
      timestamp: new Date().toISOString()
    };

    const healthIp = req.ip || req.connection.remoteAddress;
    const healthUserAgent = req.get('User-Agent');
    logger.info(`Health Check: NB Next Server is running ip=${healthIp}, userAgent=${healthUserAgent}`);

    res.json(healthData);
  });

  app.get(`${prefix}/test`, (req, res) => {
    logger.info(`Request received for ${req.url}`);
    res.send('Custom implementation of the app routes');
  });

  // Reports the app owns. reportRoutes is also walked by the framework's socket
  // report runner, so a GET route added there is reachable from both.
  app.use(`${prefix}/reports`, reportRoutes);

  app.use(`${prefix}/layouts`, layoutRoutes);

  logger.info(`App routes loaded at ${Date.now()}`);
};

module.exports = appRoutes;
