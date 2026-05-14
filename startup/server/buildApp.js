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
const errorMiddleware = require('./src/middleware/errorMiddleware');
const httpLogger = require('./src/middleware/httpLogger');
const db = require('./src/models');
const activityRoutes = require('./src/routes/activityRoutes');
const adminRoutes = require('./src/routes/admin.route');
const authRoutes = require('./src/routes/authRoutes');
const helpSupportRoutes = require('./src/routes/helpSupport.route');
const layoutRoutes = require('./src/routes/layoutRoutes');
const nbnextDriveRoutes = require('./src/routes/nbnextDriveRoutes');
const userRoutes = require('./src/routes/userRoutes');

function mountFrameworkMiddleware(app, opts = {}) {
  const {
    bodyParserLimit,
    additionalExposedHeaders = [],
    mountBeforeBodyParser
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

  // Hook for routes that must see the raw body (e.g. ADMS /iclock, where
  // ZK devices POST tab-delimited ATTLOG as application/x-www-form-urlencoded
  // and json/urlencoded parsers would clobber it into "[object Object]").
  if (typeof mountBeforeBodyParser === 'function') {
    mountBeforeBodyParser(app);
  }

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
  app.use(`${API_PREFIX}/auth`, authRoutes);
  app.use(`${API_PREFIX}/users`, userRoutes);
  app.use(`${API_PREFIX}/admin`, adminRoutes);
  app.use(`${API_PREFIX}/layouts`, layoutRoutes);
  app.use(`${API_PREFIX}/activity`, activityRoutes);
  app.use(`${API_PREFIX}/nbnext-drive`, nbnextDriveRoutes);
  app.use(`${API_PREFIX}/help-support`, helpSupportRoutes);
}

function mountStaticAndErrorHandlers(app, opts = {}) {
  const { additionalStaticDirs = [], clientStaticDir, serverOnlyPrefixes = [] } = opts;
  // App-specific statics first — they're typically more specific paths
  // (e.g. /uploads/bills) that must win over the catch-all /uploads below.
  for (const { urlPrefix, fsPath } of additionalStaticDirs) {
    app.use(urlPrefix, express.static(fsPath));
  }
  app.use('/uploads', express.static(env.UPLOADS_DIR));

  // Single-origin SPA serve: when secure cookies are off (i.e. Express is
  // fronting the UI itself, no separate nginx/dev-server origin), serve the
  // built client bundle for everything that isn't a server route or static
  // mount. Anything under /api/* (incl. /api/v1, /api/healthz, /api/trackingImage),
  // /iclock-style ADMS paths, /uploads*, and /static stays strictly server-handled
  // and 404s on miss — only true SPA routes fall back to index.html.
  if (!env.isSecureCookie && clientStaticDir) {
    const indexFile = path.join(clientStaticDir, 'index.html');
    if (fs.existsSync(indexFile)) {
      // Server-owned prefixes: API + any caller-supplied server-only paths
      // (e.g. /iclock). Static-mount prefixes: framework's /static + /uploads,
      // plus every urlPrefix the caller registered in additionalStaticDirs.
      // The SPA fallback skips any path under these — so they 404 on miss
      // instead of being shadowed by index.html.
      const serverPrefixes = ['/api', ...serverOnlyPrefixes];
      const staticPrefixes = ['/static', '/uploads', ...additionalStaticDirs.map((d) => d.urlPrefix)];
      const serverToHandle = [...serverPrefixes, ...staticPrefixes];
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
 * @param {(app: import('express').Express) => void} [options.mountBeforeBodyParser]
 *   Mount routes that must see the raw request body (i.e. before the json
 *   and urlencoded parsers run).
 * @param {Array<{urlPrefix: string, fsPath: string}>} [options.additionalStaticDirs]
 *   Extra static-file mounts. Order is preserved; mounted before /uploads.
 * @param {string} [options.clientStaticDir]
 *   Absolute path to a built SPA bundle (with index.html). When set AND
 *   env.isSecureCookie is false, Express serves the bundle for any path
 *   that isn't a server route or static mount. Use for single-origin
 *   deploys where the API server also fronts the UI.
 * @param {string[]} [options.serverOnlyPrefixes]
 *   Additional path prefixes that should stay strictly server-handled
 *   (i.e. NOT fall back to index.html). /api, /static, /uploads, and every
 *   urlPrefix from additionalStaticDirs are already excluded by default;
 *   use this for app-specific server-only prefixes like /iclock.
 * @param {() => void | Promise<void>} [options.onAfterListen]
 *   Invoked once the HTTP server is listening (after schedulers start).
 *   Use for app-level startup work like piscina pool init or auto-sync timers.
 * @param {() => Promise<void>} [options.onBeforeShutdown]
 *   Awaited during SIGTERM/SIGINT before the framework stops schedulers.
 *   Use to drain app-level resources (Piscina pool, periodic timers, etc.).
 */
function buildApp(options = {}) {
  const {
    extraRoutes = [],
    mountAppRoutes,
    registerSchedulerJobs,
    bodyParserLimit,
    additionalExposedHeaders = [],
    mountBeforeBodyParser,
    additionalStaticDirs = [],
    clientStaticDir,
    serverOnlyPrefixes = [],
    onAfterListen,
    onBeforeShutdown
  } = options;

  const app = express();
  const server = http.createServer(app);

  mountFrameworkMiddleware(app, {
    bodyParserLimit,
    additionalExposedHeaders,
    mountBeforeBodyParser
  });
  mountFrameworkRoutes(app);

  for (const { prefix, router } of extraRoutes) {
    app.use(prefix, router);
  }

  if (typeof mountAppRoutes === 'function') {
    mountAppRoutes(app, API_PREFIX);
  }

  mountStaticAndErrorHandlers(app, { additionalStaticDirs, clientStaticDir, serverOnlyPrefixes });

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

    db.sequelize.authenticate().then(() => {
      server.listen(env.PORT, () => {
        logger.info(`Server running on port ${env.PORT}`);
        // Start in-process schedulers once the HTTP server is up. No-op
        // when the app didn't pass registerSchedulerJobs.
        startAllSchedulers(registerSchedulerJobs);
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
