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
  logging: (msg) => {
    // Enable SQL logging to debug foreign key constraint issues
    logger.silly(`[Sequelize SQL] ${msg}`);
  },
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


// load all directories from the models directory
const directories = fs.readdirSync(__dirname)
  .filter(file => {
    const fullPath = path.join(__dirname, file);

    // keep only folders whose names include 'abstract_' or 'base'
    const excludeFolders = file.includes('abstract_') || file.includes('base');

    // ensure it's a directory
    const isDir = fs.statSync(fullPath).isDirectory();

    return !excludeFolders && isDir;
  });





// Helper function to load models from a directory
const loadModelsFromDirectory = (dirPath, dirName) => {
  fs.readdirSync(dirPath)
    .filter(
      file =>
        file.indexOf('.') !== 0 &&
        file !== basename &&
        file.slice(-3) === '.js' &&
        !file.includes('.test.js')
    )
    .forEach(file => {
      logger.debug(`Loading ${dirName} model: ${file}`);
      const model = require(path.join(dirPath, file))(
        sequelize,
        Sequelize.DataTypes
      );
      db[model.name] = model;
    });
};

directories.forEach(directory => {
  const directoryPath = path.join(__dirname, directory);
  loadModelsFromDirectory(directoryPath, directory);
});

// Load all models from main models directory (excluding subdirectories)
fs.readdirSync(__dirname)
  .filter(
    file =>
      file.indexOf('.') !== 0 &&
      file !== basename &&
      file.slice(-3) === '.js' &&
      !file.includes('.test.js') &&
      !directories.includes(file)
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
