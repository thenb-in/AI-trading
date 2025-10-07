// application routes called by server/index.js

const logger = require('../logger');

// export a function that takes in app and returns the app with the routes
const appRoutes = (app, prefix) => {
  // todo: automatically add prefix to app routes
  // current routes in app route need to manually add prefix
  app.get(`${prefix}/`, (req, res) => {
    // use req to get the url
    logger.info(`Request received for ${req.url}`);
    res.send('Custom implementation of the app routes');
  });

  // todo: add more app routes here - add all routes that are not in the startup routes
};

module.exports = appRoutes;
