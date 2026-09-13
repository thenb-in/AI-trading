const fs = require('fs');
const http = require('http');
const path = require('path');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const express = require('express');
const logger = require('./logger');
const { startAllSchedulers, stopAllSchedulers } = require('./scheduler');
const env = require('./src/config/env');
const { API_PREFIX } = require('./src/constants/standard_constants');
const { registerLicenseJobs } = require('./src/license/engine/core/licenseScheduler');
require('./src/license/engine/core/licenseSeal'); // imported for its side effects only
const licenseService = require('./src/license/licenseService');
const errorMiddleware = require('./src/middleware/errorMiddleware');
const httpLogger = require('./src/middleware/httpLogger');
const licenseGate = require('./src/middleware/licenseGate');
const db = require('./src/models');
const activityRoutes = require('./src/routes/activityRoutes');
const adminRoutes = require('./src/routes/admin.route');
const authRoutes = require('./src/routes/authRoutes');
const companyRoutes = require('./src/routes/companyRoutes');
const companyDetailsRoutes = require('./src/routes/companyDetailsRoutes');
const helpSupportRoutes = require('./src/routes/helpSupport.route');
const layoutRoutes = require('./src/routes/layoutRoutes');
const licenseRoutes = require('./src/routes/licenseRoutes');
const nbnextDriveRoutes = require('./src/routes/nbnextDriveRoutes');
const notificationRoutes = require('./src/notifications/notificationRoutes');
const reportRunRoutes = require('./src/routes/reportRunRoutes');
const notificationRuleRoutes = require('./src/notifications/rules/notificationRuleRoutes');
const genericReportRoutes = require('./src/routes/reportRoutes');
const userRoutes = require('./src/routes/userRoutes');

function mountFrameworkMiddleware(app, opts = {}) {
  const {
    bodyParserLimit,
    additionalExposedHeaders = []
  } = opts;

  app.use(httpLogger);

  app.use((req, res, next) => {
    logger.debug(`[ROUTE DEBUG] ${req.method} ${req.originalUrl} - Path: ${req.path}`);
    next();
  });

  const clientUrl = env.FRONTEND_URL;
  if (clientUrl) {
    logger.info(`Configuring CORS for client origin: ${clientUrl}`);
    app.use(cors({
      origin: [clientUrl],
      credentials: true,
      // x-new-access-token / x-new-refresh-token are set by the auth middleware
      // on token refresh; mobile/JS clients need them readable from JS.
      exposedHeaders: [
        'Content-Disposition',
        'x-new-access-token',
        'x-new-refresh-token',
        ...additionalExposedHeaders
      ]
    }));
  }

  app.set('trust proxy', ['loopback', '172.31.0.0/16']);  // trust first proxy (nginx) for correct client IP logging and secure cookies

  const jsonOpts = bodyParserLimit ? { limit: bodyParserLimit } : {};
  const urlencodedOpts = bodyParserLimit
    ? { extended: false, limit: bodyParserLimit }
    : { extended: false };
  app.use(express.json(jsonOpts));
  app.use(bodyParser.urlencoded(urlencodedOpts));
  app.use('/static', express.static(path.join(__dirname, 'static')));
  app.use(cookieParser());
}

function mountFrameworkRoutes(app) {
  // License routes must mount BEFORE the gate. Status/recovery endpoints
  // need to be reachable even when the license is invalid so an operator
  // can fix the install. The gate's EXEMPT_PATH_PREFIXES list mirrors
  // these paths.
  app.use(`${API_PREFIX}/license`, licenseRoutes);

  // License gate guards every subsequent route. Exempt paths (auth/login,
  // license recovery, healthz) pass through. See middleware/licenseGate.js.
  app.use(licenseGate());

  app.use(`${API_PREFIX}/auth`, authRoutes);
  app.use(`${API_PREFIX}/users`, userRoutes);
  app.use(`${API_PREFIX}/admin`, adminRoutes);
  app.use(`${API_PREFIX}/layouts`, layoutRoutes);
  app.use(`${API_PREFIX}/activity`, activityRoutes);
  app.use(`${API_PREFIX}/company`, companyRoutes);
  app.use(`${API_PREFIX}/company-details`, companyDetailsRoutes);
  app.use(`${API_PREFIX}/nbnext-drive`, nbnextDriveRoutes);
  app.use(`${API_PREFIX}/notifications`, notificationRoutes);
  app.use(`${API_PREFIX}/report-runs`, reportRunRoutes);
  app.use(`${API_PREFIX}/notification-rules`, notificationRuleRoutes);
  // Framework-shipped reports share the app's /reports namespace, so one the
  // framework provides is fetched exactly like one the app added. The app mounts
  // its own router on the same path from app_routes.
  app.use(`${API_PREFIX}/reports`, genericReportRoutes);
  app.use(`${API_PREFIX}/help-support`, helpSupportRoutes);
}

function mountStaticAndErrorHandlers(app, opts = {}) {
  const { additionalStaticDirs = [], clientStaticDir } = opts;
  // App-specific statics first — they're typically more specific paths that
  // must win over the catch-all /uploads below.
  for (const { urlPrefix, fsPath } of additionalStaticDirs) {
    app.use(urlPrefix, express.static(fsPath));
  }
  app.use('/uploads', express.static(env.UPLOADS_DIR));

  // Single-origin SPA serve: when secure cookies are off (i.e. Express is
  // fronting the UI itself, no separate nginx/dev-server origin), serve the
  // built client bundle for everything that isn't a server route or static
  // mount. Anything under /api/* (incl. /api/v1, /api/healthz), the app's static
  // mounts, /uploads*, and /static stays strictly server-handled
  // and 404s on miss — only true SPA routes fall back to index.html.
  if (env.isOnPremDeployment && clientStaticDir) {
    const indexFile = path.join(clientStaticDir, 'index.html');
    if (fs.existsSync(indexFile)) {
      // Server-owned prefix: /api. Static-mount prefixes: framework's /static + /uploads,
      // plus every urlPrefix the caller registered in additionalStaticDirs.
      // The SPA fallback skips any path under these — so they 404 on miss
      // instead of being shadowed by index.html.
      const serverToHandle = ['/api', '/static', '/uploads', ...additionalStaticDirs.map((d) => d.urlPrefix)];
      const isServerOnly = (urlPath) =>
        serverToHandle.some((p) => urlPath === p || urlPath.startsWith(`${p}/`));
      const clientStatic = express.static(clientStaticDir);
      app.use((req, res, next) => {
        if (isServerOnly(req.path)) {
          return next();
        }
        return clientStatic(req, res, next);
      });
      app.get('*', (req, res, next) => {
        if (isServerOnly(req.path)) {
          return next();
        }
        res.sendFile(indexFile);
      });
      logger.info(`Serving SPA from ${clientStaticDir} (SECURE_COOKIE is off)`);
    } else {
      logger.warn(`SPA mount skipped: ${indexFile} not found`);
    }
  }

  app.use(errorMiddleware);
  app.get('/api/healthz', (req, res) => {
    res.status(200).send('ok');
  });
}

/**
 * Build the Express app + HTTP server. Consumers pass in app-specific
 * extensions (extra routes, the legacy app_routes-style mount fn) so the
 * framework boot logic is shared but the app stays separable.
 *
 * @param {object} options
 * @param {Array<{prefix: string, router: import('express').Router}>} [options.extraRoutes]
 *   Routers mounted under the given prefix BEFORE the legacy app_routes hook.
 * @param {(app: import('express').Express, prefix: string) => void} [options.mountAppRoutes]
 *   Optional callback to register routes in the legacy `(app, prefix)` style.
 * @param {() => void} [options.registerSchedulerJobs]
 *   Optional callback that calls `registerJob(...)` for each in-process
 *   scheduled job the app wants. Invoked by startServer() once the HTTP
 *   server is listening; the framework owns the surrounding lifecycle
 *   (start/stop on SIGTERM/SIGINT) so apps don't have to.
 * @param {string} [options.bodyParserLimit]
 *   Body size limit passed to express.json + bodyParser.urlencoded
 *   (e.g. '5mb' for apps that accept image uploads).
 * @param {string[]} [options.additionalExposedHeaders]
 *   Extra response headers to expose via CORS, beyond the framework defaults.
 * @param {Array<{urlPrefix: string, fsPath: string}>} [options.additionalStaticDirs]
 *   Extra static-file mounts. Order is preserved; mounted before /uploads.
 * @param {string} [options.clientStaticDir]
 *   Absolute path to a built SPA bundle (with index.html). When set AND
 *   env.isSecureCookie is false, Express serves the bundle for any path
 *   that isn't a server route or static mount. Use for single-origin
 *   deploys where the API server also fronts the UI.
 * @param {() => void | Promise<void>} [options.onAfterListen]
 *   Invoked once the HTTP server is listening (after schedulers start).
 *   Use for app-level startup work like socket clients or timers.
 * @param {() => Promise<void>} [options.onBeforeShutdown]
 *   Awaited during SIGTERM/SIGINT before the framework stops schedulers.
 *   Use to drain app-level resources (worker pools, periodic timers, etc.).
 */
function buildApp(options = {}) {
  const {
    extraRoutes = [],
    mountAppRoutes,
    registerSchedulerJobs,
    bodyParserLimit,
    additionalExposedHeaders = [],
    additionalStaticDirs = [],
    clientStaticDir,
    onAfterListen,
    onBeforeShutdown
  } = options;

  const app = express();
  const server = http.createServer(app);

  mountFrameworkMiddleware(app, {
    bodyParserLimit,
    additionalExposedHeaders
  });
  mountFrameworkRoutes(app);

  for (const { prefix, router } of extraRoutes) {
    app.use(prefix, router);
  }

  if (typeof mountAppRoutes === 'function') {
    mountAppRoutes(app, API_PREFIX);
  }

  mountStaticAndErrorHandlers(app, { additionalStaticDirs, clientStaticDir });

  /**
   * Synchronizes models when SYNC_DB is enabled (dev + first-time installs),
   * then starts listening on env.PORT. Production should keep SYNC_DB off and
   * use explicit migrations instead.
   * @returns {Promise<void>}
   */
  const startServer = async () => {
    const sequelize = db.sequelize;
    if (env.SYNC_DB) {
      await sequelize
        .sync({ alter: false, logging: (msg) => logger.silly(`[Sync SQL] ${msg}`) })
        .then(() => {
          logger.info(`Database tables synchronized successfully at ${new Date().toISOString()}`);
        })
        .catch(error => {
          logger.error('Error synchronizing database tables', error);
          if (error.sql) {
            logger.error('SQL that caused error:', error);
          }
        });
    }

    // Graceful shutdown: drain app-level resources, then stop scheduled
    // ticks before exit so no new job fires mid-teardown. Installed before
    // listen so a fast SIGTERM during boot still cleans up.
    let shuttingDown = false;
    for (const sig of ['SIGTERM', 'SIGINT']) {
      process.on(sig, async () => {
        if (shuttingDown) {
          return;
        }
        shuttingDown = true;
        if (typeof onBeforeShutdown === 'function') {
          try {
            await onBeforeShutdown();
          } catch (err) {
            logger.error(`onBeforeShutdown failed: ${err.message}`, err);
          }
        }
        try {
          stopAllSchedulers();
        } catch { /* exit anyway */ }
        process.exit(0);  // eslint-disable-line no-process-exit
      });
    }

    db.sequelize.authenticate().then(async () => {
      // Boot-time license verification. We DO NOT block listen on failure
      // here — the gate will reject every request anyway, and `/api/license/*`
      // recovery routes need to be reachable for the operator to install/
      // renew. Logging the failure prominently is enough.
      try {
        const state = await licenseService.loadAndVerify();
        if (state.ok) {
          if (state.bypass) {
            logger.warn(`[license] enforcement bypassed (dev mode, reason=${state.reason}). All permissions allowed.`);
          } else {
            logger.info(`[license] active license_id=${state.payload.license_id} serial=${state.payload.serial} expires=${state.payload.expires_at}`);
          }
        } else {
          logger.warn(`[license] LOCKED at boot: reason=${state.reason}. All non-recovery endpoints will return 503.`);
        }
      } catch (err) {
        logger.error(`[license] boot verification crashed: ${err.message}`, err);
      }

      server.listen(env.PORT, () => {
        logger.info(`Server running on port ${env.PORT}`);
        // Start in-process schedulers once the HTTP server is up. The
        // framework always registers its own jobs (license renewal +
        // wallclock seal bump) in addition to the app's optional
        // registration callback.
        startAllSchedulers(() => {
          registerLicenseJobs();
          if (typeof registerSchedulerJobs === 'function') {
            registerSchedulerJobs();
          }
        });
        if (typeof onAfterListen === 'function') {
          try {
            const ret = onAfterListen();
            if (ret && typeof ret.catch === 'function') {
              ret.catch((err) => logger.error(`onAfterListen failed: ${err.message}`, err));
            }
          } catch (err) {
            logger.error(`onAfterListen failed: ${err.message}`, err);
          }
        }
      });
    }).catch(err => {
      logger.error('Database sync failed', err);
    });
  };

  return { app, server, startServer };
}

module.exports = { buildApp };
