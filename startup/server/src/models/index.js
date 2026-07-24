'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const logger = require('../../logger');
const { createSequelize } = require('../utils/createSequelize');

// Normalize __filename so the self-exclusion filter below works in both source
// mode (__filename = "index.js") and bytenode-compiled mode (__filename =
// "index.jsc"). Without this, the bundled server re-requires its own stub and
// ends up calling `{}` as a factory.
const basename = path.basename(__filename, path.extname(__filename)) + '.js';

const db = {};
const sequelize = createSequelize();


// load all directories from the models directory
const directories = fs.readdirSync(__dirname)
  .filter(file => {
    const fullPath = path.join(__dirname, file);

    // skip non-model folders (abstracts, base classes, shared mixins, registries)
    const excludeFolders = file.includes('abstract_') || file.includes('base') || file === 'mixins' || file === 'register';

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
