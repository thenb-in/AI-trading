'use strict';

const Sequelize = require('sequelize');
const env = require('../config/env');
const logger = require('../../logger');

const baseOptions = {
  logging: (msg) => {
    logger.silly(`[Sequelize SQL] ${msg}`);
  },
  define: {
    underscored: true
  },
  pool: {
    max: 10,
    min: 0,
    acquire: 60000,
    idle: 10000
  },
  retry: {
    max: 3
  },
  dialectOptions: {
    connectTimeout: 30000
  }
};

const createSequelize = () => {
  const config = require('../config/config')[env.NODE_ENV];
  if (config.use_env_variable) {
    return new Sequelize(env.DATABASE_URL, {
      dialect: config.dialect,
      ...baseOptions
    });
  }
  return new Sequelize(
    config.database,
    config.username,
    config.password,
    { ...config, ...baseOptions }
  );
};

module.exports = { createSequelize };
