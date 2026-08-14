require('module-alias/register');
// Let code under @startup resolve npm libs from app/server/node_modules. Most
// runtime deps (body-parser, cookie-parser, cors, express, …) live here, not
// in startup/server, so without this, requires from startup-loaded files like
// startup/server/buildApp.js fail with MODULE_NOT_FOUND.
require('module-alias').addPath(require('path').join(__dirname, 'node_modules'));
// App columns onto framework models — must load before @startup models below.
// eslint-disable-next-line custom/no-direct-model-imports
require('./src/models/register/registerAppModelFields');
require('./src/data/registerAppData');

// App-side server boot. Wires the framework's buildApp() with this app's
// own routes, middleware, schedulers and shutdown hooks.
//
// The framework (auth, users, admin, layouts, activity, nbnext-drive,
// help-support) is composed by buildApp() under /api/v1/*. Everything
// app-specific is wired here.

const path = require('path');
const env = require('@startup/src/config/env');
const { buildApp } = require('@startup/buildApp');
const { registerAllJobs } = require('./scheduler');
const appRoutes = require('./src/routes/app_routes');
const companyProfileRoutes = require('./src/routes/companyProfileRoutes');
const { initAppServerRunnerClient, initClientAppServerSocket } = require('@startup/src/socket');

// Where this app's billable heads read their history from, for the framework's
// headbase. A head on the wallet's rate card that is not registered here is
// reported as unsupported rather than silently skipped. The reference scaffold
// bills on nothing, so it registers no sources:
//
//   const headBaseService = require('@startup/src/services/headBaseService');
//   headBaseService.registerSource('<Head>', <sourceWithTimelineFn>);

const { server, startServer } = buildApp({
  // 5MB body limit — image uploads, base64 photos.
  bodyParserLimit: '5mb',

  // App-owned routes that depend on app-specific things but live under the
  // framework's /api/v1/* namespace.
  extraRoutes: [
    { prefix: '/api/v1/company-profile', router: companyProfileRoutes }
  ],

  // All app-specific routes. See src/routes/app_routes.js.
  mountAppRoutes: (app, prefix) => {
    appRoutes(app, prefix);
  },

  // Extra static mounts, beyond the /uploads the framework already serves.
  // More specific paths must come first so they win over /uploads, and fsPath
  // must be absolute, e.g.
  //   { urlPrefix: '/uploads/bills', fsPath: path.join(env.UPLOADS_DIR, 'bills') }
  additionalStaticDirs: [],

  // Single-origin SPA serve: when SECURE_COOKIE is off, also serve the built
  // client bundle from this Express server. Path defaults to ../client (the
  // deployed layout where app/client/ holds the built bundle); override via
  // CLIENT_STATIC_DIR for local testing (e.g. CLIENT_STATIC_DIR=../client/dist).
  clientStaticDir: path.resolve(process.cwd(), env.CLIENT_STATIC_DIR),

  registerSchedulerJobs: registerAllJobs,

  // Initialise heavy app-level resources once the HTTP server is up.
  onAfterListen: () => {
    initAppServerRunnerClient();
    initClientAppServerSocket(server);
  }
});

startServer();
