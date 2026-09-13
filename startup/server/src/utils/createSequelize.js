'use strict';

// Re-export shim: the bootstrap itself lives in nucleus/db/createSequelize.
// This file supplies startup's env to it at the path existing imports use.

const env = require('../config/env');
const { createSequelize: createNucleusSequelize } = require('@nucleus/db/createSequelize');

const createSequelize = () => createNucleusSequelize({
  databaseUrl: env.DATABASE_URL
});

module.exports = { createSequelize };
