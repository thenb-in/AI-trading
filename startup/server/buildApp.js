const http = require('http');
const path = require('path');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const express = require('express');
const logger = require('./logger');
const env = require('./src/config/env');
const errorMiddleware = require('./src/middleware/errorMiddleware');
const httpLogger = require('./src/middleware/httpLogger');
const db = require('./src/models');
const activityRoutes = require('./src/routes/startup/activityRoutes');
const adminRoutes = require('./src/routes/startup/admin.route');
const authRoutes = require('./src/routes/startup/authRoutes');
const companyRoutes = require('./src/routes/startup/companyRoutes');
const helpSupportRoutes = require('./src/routes/startup/helpSupport.route');
const layoutRoutes = require('./src/routes/startup/layoutRoutes');
const nbnextDriveRoutes = require('./src/routes/startup/nbnextDriveRoutes');
const userRoutes = require('./src/routes/startup/userRoutes');

const API_PREFIX = '/api/v1';

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

  app.use(express.json());
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use('/static', express.static(path.join(__dirname, 'static')));
  app.use(cookieParser());
}

function mountFrameworkRoutes(app) {
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
  app.get('/healthz', (req, res) => {
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
 */
function buildApp(options = {}) {
  const { extraRoutes = [], mountAppRoutes } = options;

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
   * Synchronizes models in non-production, then starts listening on env.PORT.
   * @returns {Promise<void>}
   */
  const startServer = async () => {
    const sequelize = db.sequelize;
    if (!env.isProduction) {
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

    db.sequelize.authenticate().then(() => {
      server.listen(env.PORT, () => {
        logger.info(`Server running on port ${env.PORT}`);
      });
    }).catch(err => {
      logger.error('Database sync failed', err);
    });
  };

  return { app, server, startServer, API_PREFIX };
}

module.exports = { buildApp, API_PREFIX };
