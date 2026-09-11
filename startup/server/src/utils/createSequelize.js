'use strict';

// Re-export shim: the bootstrap itself now lives in nucleus/db/createSequelize
// so the framework and the standalone biometric gateways share ONE connection
// policy instead of two hand-synced copies. This file stays at its original
// path (and keeps reading startup's env) so existing imports work unchanged.

const env = require('../config/env');
const { createSequelize: createNucleusSequelize } = require('@nucleus/db/createSequelize');

const createSequelize = () => createNucleusSequelize({
  databaseUrl: env.DATABASE_URL
});

module.exports = { createSequelize };
