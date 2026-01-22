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
const appRoutes = require('./src/routes/app_routes');
const companyProfileRoutes = require('./src/routes/companyProfileRoutes');
const activityRoutes = require('./src/routes/startup/activityRoutes');
const adminRoutes = require('./src/routes/startup/admin.route');
const authRoutes = require('./src/routes/startup/authRoutes');
const companyRoutes = require('./src/routes/startup/companyRoutes');
const layoutRoutes = require('./src/routes/startup/layoutRoutes');
const userRoutes = require('./src/routes/startup/userRoutes');

const app = express();
const server = http.createServer(app);

app.use(httpLogger);

// // Debug middleware to log all requests before routing
app.use((req, res, next) => {
  logger.debug(`[ROUTE DEBUG] ${req.method} ${req.originalUrl} - Path: ${req.path}`);
  next();
});

// CORS configuration
const clientUrl = env.FRONTEND_URL;
if (clientUrl) {
  logger.info(`Configuring CORS for client origin: ${clientUrl}`);

  const corsOptions = {
    origin: [clientUrl],
    credentials: true,
    exposedHeaders: ['Content-Disposition']
  };

  app.use(cors(corsOptions));
}

// app.set('trust proxy', true);


app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use('/static', express.static(path.join(__dirname, 'static')));
app.use(cookieParser());

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/company', companyRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/company-profile', companyProfileRoutes);
app.use('/api/v1/layouts', layoutRoutes);
app.use('/api/v1/activity', activityRoutes);
// App routes (custom routes)

appRoutes(app, '/api/v1');  // todo: app routes for "/api/v1"
// current routes in app route need to manually add /api/v1 prefix
// todo: automatically add /api/v1 prefix to app routes

app.use('/uploads', express.static(env.UPLOADS_DIR));

// Error handling middleware - must be last
app.use(errorMiddleware);
app.get('/healthz', (req, res) => {
  res.status(200).send('ok');
});


// Start server after syncing database
const PORT = env.PORT;

// Test DB connection and start server
const startServer = async () => {
  // Synchronize models
  // sync only if not in production
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
    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  }).catch(err => {
    logger.error('Database sync failed', err);
  });
};

startServer();
