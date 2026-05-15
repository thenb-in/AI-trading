// app_routes.js
const logger = require('@startup/logger');
const env = require('@startup/src/config/env');


// export a function that takes in app and returns the app with the routes
const appRoutes = (app, prefix) => {
  // todo: should protect these routes with auth middleware?

  // todo: automatically add prefix to app routes
  // current routes in app route need to manually add prefix
  // Health check endpoint

  // const authRoutes = require('../routes/startup/authRoutes');
  // const userRoutes = require('../routes/startup/userRoutes');
  // const companyRoutes = require('../routes/startup/companyRoutes');
  // const adminRoutes = require('../routes/startup/admin.route');
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



  // app.use('${prefix}/auth', authRoutes);
  // app.use('${prefix}/v1/auth', authRoutes);
  // app.use('${prefix}/v1/users', userRoutes);
  // app.use('${prefix}/v1/company', companyRoutes);
  // app.use('${prefix}/v1/admin', adminRoutes);

  logger.info(`App routes loaded at ${Date.now()}`);
};

module.exports = appRoutes;
