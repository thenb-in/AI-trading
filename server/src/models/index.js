'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const process = require('process');
const env = require('../config/env'); // Load environment variables
const logger = require('../../logger');

const basename = path.basename(__filename);
const nodeEnv = env.NODE_ENV;
const config = require('../config/config.js')[nodeEnv];

const db = {};

let sequelize;
const default_config = {
  logging: false, // Disable SQL logging
  define: {
    underscored: true // Use snake_case for automatically added attributes
  }
};

if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], {
    dialect: config.dialect,
    ...default_config
  });
} else {
  sequelize = new Sequelize(
    config.database,
    config.username,
    config.password,
    {
      ...config,
      ...default_config
    }
  );
}

// todo: load models in subdirectories as well
// Load all models from startup directory
const startup_path = path.join(__dirname, 'startup');
fs.readdirSync(startup_path)
  .filter(
    file =>
      file.indexOf('.') !== 0 &&
      file !== basename &&
      file.slice(-3) === '.js' &&
      !file.includes('.test.js')
  )
  .forEach(file => {
    logger.debug(`Loading startup model: ${file}`);
    const model = require(path.join(startup_path, file))(
      sequelize,
      Sequelize.DataTypes
    );
    db[model.name] = model;
  });

// Load all models from main models directory (excluding startup subdirectory)
fs.readdirSync(__dirname)
  .filter(
    file =>
      file.indexOf('.') !== 0 &&
      file !== basename &&
      file.slice(-3) === '.js' &&
      !file.includes('.test.js') &&
      file !== 'startup' // Exclude startup directory itself
  )
  .forEach(file => {
    logger.debug(`Loading app model: ${file}`);
    const model = require(path.join(__dirname, file))(
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

db.sequelize = sequelize;

module.exports = db;
