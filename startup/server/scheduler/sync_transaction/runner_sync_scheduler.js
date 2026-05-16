// Standalone scheduler process for periodic transaction sync.
//
// Run as: node scheduler/sync_transaction/runner_sync_scheduler.js
// or via: npm run transaction-sync-scheduler
//
// All the lifecycle plumbing (db auth, immediate first tick, cron schedule,
// overlap guard, SIGINT/SIGTERM handling, db close on exit) lives in
// scheduler/lib/standaloneSchedulerFactory.js so this file stays a thin
// configuration shim.
const env = require('../../src/config/env');
const { createStandaloneScheduler } = require('../lib/standaloneSchedulerFactory');
const syncOnce = require('./runner_sync_once');

createStandaloneScheduler({
  name: 'sync_transaction',
  cronTime: env.SYNC_TRANSACTION_CRON,
  syncOnce,
  batchSize: env.SYNC_TRANSACTION_BATCH_SIZE
});
