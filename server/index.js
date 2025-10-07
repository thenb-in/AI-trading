const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const env = require('./src/config/env');
// require('./sheduler/messageDelete')
const db = require('./src/models');
const authRoutes = require('./src/routes/startup/authRoutes');
const userRoutes = require('./src/routes/startup/userRoutes');
const companyRoutes = require('./src/routes/startup/companyRoutes');
const adminRoutes = require('./src/routes/startup/admin.route');
const errorMiddleware = require('./src/middleware/errorMiddleware');

const cookieParser = require('cookie-parser');
const app = express();
const bodyParser = require('body-parser');
const server = http.createServer(app);
const logger = require('./logger');


// Test database connection
db.sequelize.authenticate()
  .then(() => logger.debug(`Database connected successfully at ${new Date().toISOString()}`))
  .catch(err =>  logger.error(`❌ Database connection error: ${err.message} - Stack: ${err.stack}`));

// Middleware
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use('/static', express.static(path.join(__dirname, 'static')));
app.use(cookieParser());
// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/company', companyRoutes);
app.use('/api/v1/admin', adminRoutes);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// Error handling
app.use(errorMiddleware);


// Start server after syncing database
const PORT = env.PORT;

db.sequelize.sync({ force: false }).then(() => {
  server.listen(PORT, () => {
    logger.info(`Server running on http://localhost:${PORT} at ${new Date().toISOString()}`);
  });
}).catch(err => {
  logger.error(`Database sync failed: ${err.message} - Stack: ${err.stack}`);
});
