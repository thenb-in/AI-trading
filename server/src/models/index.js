'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const process = require('process');
const env = require('../config/env'); // Load environment variables

const basename = path.basename(__filename);
const nodeEnv = env.NODE_ENV;
const config = require('../config/config.js')[nodeEnv];
const logger = require('../../logger');

const db = {};

let sequelize;

if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], {
    dialect: config.dialect,
    logging: false // Disable SQL logging
  });
} else {
  sequelize = new Sequelize(
    config.database,
    config.username,
    config.password,
    config
  );
}

const complete_path=path.join(__dirname,'startup');
// Load all models
fs.readdirSync(complete_path)
  .filter(
    file =>
      file.indexOf('.') !== 0 &&
      file !== basename &&
      file.slice(-3) === '.js' &&
      !file.includes('.test.js')
  )
  .forEach(file => {
    const model = require(path.join(complete_path, file))(
      sequelize,
      Sequelize.DataTypes
    );
    db[model.name] = model;
  });

// Associate models
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

// Test connection
sequelize
  .authenticate()
  .then(() => {
    logger.info(`Database connection established successfully at ${new Date().toISOString()}`);
  })
  .catch(err => {
    logger.error(`Unable to connect to the database: ${err.message} - Stack: ${err.stack}`);
  });

// Synchronize models
// sync only if not in production
if (nodeEnv !== 'production') {
  sequelize
    .sync()
    .then(() => {
      logger.info(`Database tables synchronized successfully at ${new Date().toISOString()}`);
    })
    .catch(error => {
      logger.error(`Error synchronizing database tables: ${error.message} - Stack: ${error.stack}`);
    });
}

db.sequelize = sequelize;

module.exports = db;
