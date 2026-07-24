'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const logger = require('@startup/logger');
const frameworkDb = require('@startup/src/models');

// Reuse the framework's Sequelize instance. Loading app models against the
// same instance means buildApp's sequelize.sync() in startup/server creates
// every table — framework + app — on a single connection pool, and avoids
// the previous "fresh DB only got framework tables" bug.
const sequelize = frameworkDb.sequelize;

const basename = path.basename(__filename, path.extname(__filename)) + '.js';

const db = {};

// Seed the combined registry with the already-loaded framework models so
// app-side associate() can resolve cross-package targets like
// IclockTerminal.belongsTo(Company).
for (const [name, model] of Object.entries(frameworkDb)) {
  if (name === 'sequelize' || name === 'Sequelize') {
    continue;
  }
  db[name] = model;
}

const isModelDir = (parentDir, name) => {
  if (name.includes('abstract_') || name.includes('base') || name === 'mixins' || name === 'register') {
    return false;
  }
  return fs.statSync(path.join(parentDir, name)).isDirectory();
};

const isModelFile = (file) =>
  file.indexOf('.') !== 0 &&
  file !== basename &&
  file.slice(-3) === '.js' &&
  !file.includes('.test.js');

// Names of models loaded by *this* file. Framework models already ran their
// own associate() against the framework registry — re-running them with the
// combined registry would throw "alias already used".
const appModelNames = [];

const loadAppModels = (rootDir, rootLabel) => {
  const subdirs = fs.readdirSync(rootDir).filter(name => isModelDir(rootDir, name));
  subdirs.forEach(sub => {
    const subPath = path.join(rootDir, sub);
    fs.readdirSync(subPath).filter(isModelFile).forEach(file => {
      logger.debug(`Loading ${sub} model: ${file}`);
      const model = require(path.join(subPath, file))(sequelize, Sequelize.DataTypes);
      db[model.name] = model;
      appModelNames.push(model.name);
    });
  });
  fs.readdirSync(rootDir)
    .filter(file => isModelFile(file) && !subdirs.includes(file))
    .forEach(file => {
      logger.debug(`Loading ${rootLabel} model: ${file}`);
      const model = require(path.join(rootDir, file))(sequelize, Sequelize.DataTypes);
      db[model.name] = model;
      appModelNames.push(model.name);
    });
};

loadAppModels(__dirname, 'app');

appModelNames.forEach(name => {
  if (db[name].associate) {
    db[name].associate(db);
  }
});

db.sequelize = sequelize;

// Register this complete registry (framework + HR + relocated device models)
// as the process registry for the shared biometric-interface services in
// common/. Those services read the registry lazily via getDb(); when they run
// inside THIS app process (operator-initiated device actions through
// @biometric), getDb() must hand back the app's full registry — Company and
// Employee present — so guarded device associations resolve. A standalone
// gateway never reaches here; it calls buildRegistry() instead.
require('@biometric_interface/common/db').useRegistry(db);

module.exports = db;
