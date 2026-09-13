'use strict';

// Sequelize bootstrap — the single place that decides pool/retry/define options.
//
// Lives in nucleus so every server layer shares one connection policy.
//
// Callers pass their own databaseUrl rather than this module reading
// process.env, so env reading stays with the caller and only the connection
// policy is shared.
//
// The dialect is NOT passed: Sequelize derives it from the URL scheme
// (postgresql:// → postgres, normalized internally) and overwrites any dialect
// option with the URL's protocol regardless, so a separate DB_DIALECT was inert.
// `sequelize.getDialect()` is the honest source of truth for anyone who needs it.
//
// `sequelize` resolves through the host's `sequelize` module-alias, which both
// app/server and the gateways point at startup/server/node_modules/sequelize.
// That single instance is what makes the `instanceof` in `retry.match` work —
// do NOT add sequelize to nucleus's own dependencies.

const Sequelize = require('sequelize');
const logger = require('../logger');

const createSequelize = ({ databaseUrl }) => {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set — cannot open a database connection.');
  }

  return new Sequelize(databaseUrl, {
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
    // Retry only transient connection failures. Without `match`, Sequelize retries
    // every error — a failed statement inside a transaction gets replayed on the
    // now-aborted transaction, so the thrown error becomes "current transaction is
    // aborted" and the real cause is lost.
    retry: {
      max: 3,
      match: [Sequelize.ConnectionError]
    },
    dialectOptions: {
      connectTimeout: 30000
    }
  });
};

module.exports = { createSequelize };
