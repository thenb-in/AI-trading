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
const licenseService = require('./src/license/licenseService');
const licenseSeal = require('./src/license/licenseSeal'); // eslint-disable-line no-unused-vars
const { registerLicenseJobs } = require('./src/license/licenseScheduler');
const errorMiddleware = require('./src/middleware/errorMiddleware');
const httpLogger = require('./src/middleware/httpLogger');
const licenseGate = require('./src/middleware/licenseGate');
const db = require('./src/models');
const activityRoutes = require('./src/routes/activityRoutes');
const adminRoutes = require('./src/routes/admin.route');
const authRoutes = require('./src/routes/authRoutes');
const companyRoutes = require('./src/routes/companyRoutes');
const helpSupportRoutes = require('./src/routes/helpSupport.route');
const layoutRoutes = require('./src/routes/layoutRoutes');
const licenseRoutes = require('./src/routes/licenseRoutes');
const nbnextDriveRoutes = require('./src/routes/nbnextDriveRoutes');
const userRoutes = require('./src/routes/userRoutes');

function mountFrameworkMiddleware(app) {
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
      exposedHeaders: ['Content-Disposition']
    }));
  }

  app.set('trust proxy', ['loopback', '172.31.0.0/16']);  // trust first proxy (nginx) for correct client IP logging and secure cookies

  app.use(express.json());
  app.use(bodyParser.urlencoded({ extended: false }));
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
  app.use(`${API_PREFIX}/company`, companyRoutes);
  app.use(`${API_PREFIX}/admin`, adminRoutes);
  app.use(`${API_PREFIX}/layouts`, layoutRoutes);
  app.use(`${API_PREFIX}/activity`, activityRoutes);
  app.use(`${API_PREFIX}/nbnext-drive`, nbnextDriveRoutes);
  app.use(`${API_PREFIX}/help-support`, helpSupportRoutes);
}

function mountStaticAndErrorHandlers(app) {
  app.use('/uploads', express.static(env.UPLOADS_DIR));
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
 */
function buildApp(options = {}) {
  const { extraRoutes = [], mountAppRoutes, registerSchedulerJobs } = options;

  const app = express();
  const server = http.createServer(app);

  mountFrameworkMiddleware(app);
  mountFrameworkRoutes(app);

  for (const { prefix, router } of extraRoutes) {
    app.use(prefix, router);
  }

  if (typeof mountAppRoutes === 'function') {
    mountAppRoutes(app, API_PREFIX);
  }

  mountStaticAndErrorHandlers(app);

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

    // Graceful shutdown: stop scheduled ticks before exit so no new job
    // fires mid-teardown. Installed before listen so a fast SIGTERM during
    // boot still cleans up.
    for (const sig of ['SIGTERM', 'SIGINT']) {
      process.on(sig, () => {
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
        const state = await licenseService.loadAndVerify({ force: true });
        if (state.ok) {
          if (state.bypass) {
            logger.warn('[license] enforcement bypassed (dev mode). All permissions allowed.');
          } else {
            logger.info(`[license] active license_id=${state.payload.license_id} serial=${state.payload.serial} expires=${state.payload.expires_at}`);
          }
        } else {
          logger.error(`[license] LOCKED at boot: ${state.reason}. All non-recovery endpoints will return 503.`);
        }
      } catch (err) {
        logger.error(`[license] boot verification crashed: ${err.message}`);
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
      });
    }).catch(err => {
      logger.error('Database sync failed', err);
    });
  };

  return { app, server, startServer };
}

module.exports = { buildApp };
