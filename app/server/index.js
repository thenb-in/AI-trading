require('./bootstrapAliases');
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
const companyProfileTradingRoutes = require('./src/routes/companyProfileTradingRoutes');

// Trading app routers (migrated from the legacy monolith). marketRoutes and
// zerodhaAuthRoutes carry their own `/market`, `/options`, `/auth`, `/zerodha`,
// `/debug` subpaths so they mount at the API root; the rest mount under /market.
// executionRoutes is mounted BEFORE method2Routes so the AUTO_EXECUTION-gated
// autotrade/catchup/gtt endpoints take precedence (the duplicates were also
// stripped from method2Routes during the weave).
const marketRoutes = require('./src/routes/marketRoutes');
const zerodhaAuthRoutes = require('./src/routes/zerodhaAuthRoutes');
const executionRoutes = require('./src/routes/executionRoutes');
const method2Router = require('./src/routes/method2Routes');
const optionChainRoutes = require('./src/routes/optionChainRoutes');
const backtestRoutes = require('./src/routes/backtestRoutes');
const scalpRoutes = require('./src/routes/scalpRoutes');
const archiveRoutes = require('./src/routes/archiveRoutes');
const mailerRoutes = require('./src/routes/mailerRoutes');
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

  // App-owned routes that live under the framework's /api/v1/* namespace.
  extraRoutes: [
    { prefix: '/api/v1/company-profile', router: companyProfileRoutes },
    { prefix: '/api/v1/company-profile/trading', router: companyProfileTradingRoutes },
    // Market read endpoints (paths already include /market, /options) + Zerodha
    // OAuth/debug (paths include /auth, /zerodha, /debug) mount at the API root.
    { prefix: '/api/v1', router: marketRoutes },
    { prefix: '/api/v1', router: zerodhaAuthRoutes },
    // Execution first so its AUTO_EXECUTION-gated autotrade/catchup/gtt win.
    { prefix: '/api/v1/market', router: executionRoutes },
    { prefix: '/api/v1/market', router: method2Router },
    { prefix: '/api/v1/market', router: optionChainRoutes },
    { prefix: '/api/v1/market', router: backtestRoutes },
    { prefix: '/api/v1/market/scalp', router: scalpRoutes },
    { prefix: '/api/v1/market/history', router: archiveRoutes },
    { prefix: '/api/v1/mailer', router: mailerRoutes }
  ],

  // The app's own routes. See src/routes/app_routes.js.
  mountAppRoutes: (app, prefix) => {
    appRoutes(app, prefix);
  },

  // Single-origin SPA serve: when SECURE_COOKIE is off, also serve the built
  // client bundle from this Express server. Path defaults to ../client (the
  // deployed layout where app/client/ holds the built bundle); override via
  // CLIENT_STATIC_DIR for local testing (e.g. CLIENT_STATIC_DIR=../client/dist).
  clientStaticDir: path.resolve(process.cwd(), env.CLIENT_STATIC_DIR),

  registerSchedulerJobs: registerAllJobs,

  // Initialise heavy app-level resources once the HTTP server is up.
  onAfterListen: async () => {
    initAppServerRunnerClient();
    initClientAppServerSocket(server);

    // Trading boot sequence (migrated from the legacy index.js tail):
    // 1. Load the persisted mailer secret from AppSetting into memory.
    // 2. Replay recent trade signals into the engine's in-memory ledger.
    // 3. Start the Zerodha websocket ticker (needs the daily token; it stays
    //    down and is restarted by the OAuth callback if the token is stale).
    const logger = require('@startup/logger');
    try {
      await require('./src/utils/mailerService').loadMailerConfig();
    } catch (err) {
      logger.warn(`[mailer] loadMailerConfig failed: ${err.message}`);
    }
    try {
      await require('./src/services/method2EngineService').loadSignalHistory();
    } catch (err) {
      logger.warn(`[method2] loadSignalHistory failed: ${err.message}`);
    }
    try {
      require('./src/services/tickerService').start();
    } catch (err) {
      logger.warn(`[ticker] start failed: ${err.message}`);
    }
  }
});

startServer();
