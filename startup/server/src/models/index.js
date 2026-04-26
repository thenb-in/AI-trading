'use strict';

const fs = require('fs');
const path = require('path');
const process = require('process');
const Sequelize = require('sequelize');
const logger = require('../../logger');
const config = require('../config/config');
const env = require('../config/env');

const basename = path.basename(__filename);
const nodeEnv = env.NODE_ENV;
const dbConfig = config[nodeEnv];

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

if (dbConfig.use_env_variable) {
  sequelize = new Sequelize(process.env[dbConfig.use_env_variable], {
    dialect: dbConfig.dialect,
    ...default_config
  });
} else {
  sequelize = new Sequelize(
    dbConfig.database,
    dbConfig.username,
    dbConfig.password,
    {
      ...dbConfig,
      ...default_config
    }
  );
}


// load all directories from the models directory
const directories = fs.readdirSync(__dirname)
  .filter(file => {
    const fullPath = path.join(__dirname, file);

    // skip non-model folders (abstracts, base classes, shared mixins)
    const excludeFolders = file.includes('abstract_') || file.includes('base') || file === 'mixins';

    // ensure it's a directory
    const isDir = fs.statSync(fullPath).isDirectory();

    return !excludeFolders && isDir;
  });





// Helper function to load models from a directory
/**
 * Loads all Sequelize model definition files from a directory, initializes them
 * with the sequelize instance, and adds them to the db object.
 * @param {string} dirPath - Absolute path to the directory containing model files
 * @param {string} dirName - Directory name (used for debug logging)
 * @side_effects Populates the db object with model instances keyed by model name
 */
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
      // eslint-disable-next-line global-require
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
    // eslint-disable-next-line global-require
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
