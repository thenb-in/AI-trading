'use strict';

// Sequelize bootstrap — the single place that decides pool/retry/define options.
//
// Lives in nucleus because BOTH the framework (startup/server, and app/server
// through it) and the standalone biometric gateways need an identical
// connection, and neither may depend on the other. It previously existed as two
// hand-synced copies whose comments claimed they mirrored each other; they
// drifted, and a retry bug had to be fixed twice.
//
// Callers pass their own databaseUrl/dialect rather than this module reading
// process.env: startup and the gateways deliberately read DIFFERENT env modules
// (the gateway's is self-contained and carries none of the HR-app keys), so env
// reading stays with the caller and only the connection policy is shared.
//
// `sequelize` resolves through the host's `sequelize` module-alias, which both
// app/server and the gateways point at startup/server/node_modules/sequelize.
// That single instance is what makes the `instanceof` in `retry.match` work —
// do NOT add sequelize to nucleus's own dependencies.

const Sequelize = require('sequelize');
const logger = require('../logger');

const createSequelize = ({ databaseUrl, dialect }) => {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set — cannot open a database connection.');
  }

  return new Sequelize(databaseUrl, {
    dialect,
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
