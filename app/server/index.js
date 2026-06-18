require('module-alias/register');
// Let code under @startup resolve npm libs from app/server/node_modules. Most
// runtime deps (body-parser, cookie-parser, cors, express, …) live here, not
// in startup/server, so without this, requires from startup-loaded files like
// startup/server/buildApp.js fail with MODULE_NOT_FOUND.
require('module-alias').addPath(require('path').join(__dirname, 'node_modules'));

// App-side server boot. Wires the framework's buildApp() with this app's
// own routes, middleware, schedulers and shutdown hooks.
//
// The framework (auth, users, admin, layouts, activity, nbnext-drive,
// help-support) is composed by buildApp() under /api/v1/*. Everything
// app-specific (your own routes, schedulers and resources) is wired here.

const path = require('path');
const logger = require('@startup/logger');
const env = require('@startup/src/config/env');
const { buildApp } = require('@startup/buildApp');
const { registerAllJobs } = require('./scheduler');
const appRoutes = require('./src/routes/app_routes');
const companyRoutes = require('./src/routes/companyRoutes');

const { startServer } = buildApp({
  // 5MB body limit — adjust to suit your app's upload needs.
  bodyParserLimit: '5mb',



  // App-owned routes that live under the framework's /api/v1/* namespace.
  extraRoutes: [
    { prefix: '/api/v1/company', router: companyRoutes }
  ],

  // App-specific routes. See src/routes/app_routes.js.
  mountAppRoutes: (app, prefix) => {
    appRoutes(app, prefix);
  },

  // Static files — more specific paths first so they win over /uploads
  // (which is mounted by the framework). path is absolute to this server.

  additionalStaticDirs: [
    // { urlPrefix: '/uploads/bills', fsPath: path.join(env.UPLOADS_DIR, 'bills') },
    // { urlPrefix: '/api/trackingImage', fsPath: path.join(env.UPLOADS_DIR, 'trackingImage') }
  ],

  // Single-origin SPA serve: when SECURE_COOKIE is off, also serve the built
  // client bundle from this Express server. Path defaults to ../client (the
  // deployed layout where app/client/ holds the built bundle); override via
  // CLIENT_STATIC_DIR for local testing (e.g. CLIENT_STATIC_DIR=../client/dist).
  clientStaticDir: path.resolve(
    process.cwd(),
    env.CLIENT_STATIC_DIR
  ),


  registerSchedulerJobs: registerAllJobs,

  // Initialise heavy app-level resources once the HTTP server is up.
  onAfterListen: () => {

  },

  // Drain app-level resources before the framework stops schedulers.
  onBeforeShutdown: async () => {

    try {
    } catch (err) {
      logger.error(`Error shutting down Piscina pool: ${err.message}`, err);
    }
  }
});

startServer();
