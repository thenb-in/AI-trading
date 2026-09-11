const { sequelize } = require('../models');
const logger = require('../../logger');
const { POSTGRES_DIALECT } = require('../constants/database');

/**
 * Whether this database can be asked to stop a query that is already running.
 * Cancelling in-flight work is a server-side operation, so it exists only where
 * the dialect provides it. Read from the live connection (derived from the
 * DATABASE_URL scheme) rather than a separate env that could disagree with it.
 */
function canCancelQueries() {
  return sequelize.getDialect() === POSTGRES_DIALECT;
}

/**
 * Ask the database to cancel whatever these backend processes are currently
 * executing. Used to stop a long report the user gave up on: the work is almost
 * entirely inside the database, so this is where it is actually stopped.
 *
 * Returns how many backends were asked. Cancelling an idle backend is a no-op
 * there, so an over-broad list costs nothing.
 */
async function cancelBackends(pids = []) {
  if (pids.length === 0 || !canCancelQueries()) {
    return 0;
  }
  await sequelize.query(
    'SELECT pg_cancel_backend(pid) FROM unnest(ARRAY[:pids]::int[]) AS pid',
    { replacements: { pids }, type: 'SELECT' }
  );
  logger.debug(`[database] asked ${pids.length} backend(s) to cancel their current query`);
  return pids.length;
}

module.exports = {
  sequelize,
  canCancelQueries,
  cancelBackends
};

