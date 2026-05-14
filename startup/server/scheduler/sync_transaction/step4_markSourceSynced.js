// Step 4: Mark original iclock_transaction rows as synced
const logger = require('../../logger');
const { rowsFromQueryResult } = require('./utils');
const { sequelize } = require('../../src/services/databaseService');
// Configuration for sync_transaction
const env = require('../../src/config/env');

// Prepare a safe SQL literal for the dblink connection string
const DBLINK_CONN_LITERAL = env.DBLINK_CONNECTION.replace(/'/g, '\'\'');


async function markSourceSynced(syncedIds, t) {
  const stepStartTime = Date.now();
  logger.info(`sync_transaction: [STEP4] Starting mark source as synced for ${Array.isArray(syncedIds) ? syncedIds.length : 0} IDs...`);

  try {
    if (!syncedIds || syncedIds.length === 0) {
      logger.info(`sync_transaction: [STEP4] No source rows to mark as synced - syncedIdsCount=${syncedIds ? syncedIds.length : 0}`);
      return 0;
    }

    // Sanitize IDs to integers and inline for remote dblink UPDATE
    const sanitizeStartTime = Date.now();
    const syncedIdsCountForSanitize = Array.isArray(syncedIds) ? syncedIds.length : 0;
    logger.debug(`sync_transaction: [STEP4] Sanitizing ${syncedIdsCountForSanitize} IDs to integers at ${sanitizeStartTime}...`);
    let idsNumeric;
    try {
      idsNumeric = syncedIds
        .map((v) => {
          const n = Number(v);
          return Number.isFinite(n) ? Math.trunc(n) : null;
        })
        .filter((v) => v !== null);
      const sanitizeDuration = Date.now() - sanitizeStartTime;
      logger.debug(`sync_transaction: [STEP4] Sanitized ${idsNumeric.length} valid numeric IDs from ${syncedIds.length} total, duration=${sanitizeDuration}ms`);
    } catch (sanitizeError) {
      const sanitizeErrorDuration = Date.now() - sanitizeStartTime;
      logger.error(`sync_transaction: [STEP4] Error sanitizing IDs after ${sanitizeErrorDuration}ms`, sanitizeError);
      throw sanitizeError;
    }

    if (idsNumeric.length === 0) {
      const idsNumericCountAfterSanitize = idsNumeric.length;
      const syncedIdsCountAfterSanitize = Array.isArray(syncedIds) ? syncedIds.length : 0;
      logger.warn(`sync_transaction: [STEP4] No valid numeric IDs to mark as synced after sanitization, idsNumeric=${idsNumericCountAfterSanitize}, syncedIds=${syncedIdsCountAfterSanitize}`);
      return 0;
    }

    const idsNumericCount = idsNumeric.length;
    logger.debug(`sync_transaction: [STEP4] Building update SQL for ${idsNumericCount} IDs...`);
    const updateSql = `
      SELECT id FROM dblink(
        '${DBLINK_CONN_LITERAL}',
        'UPDATE iclock_transaction SET is_synced = TRUE WHERE id IN (${idsNumeric.join(', ')}) RETURNING id'
      ) AS updated(id integer);
    `;

    // Execute update query
    const updateStartTime = Date.now();
    const idsNumericCountForUpdate = idsNumeric.length;
    logger.info(`sync_transaction: [STEP4] Executing update query to mark ${idsNumericCountForUpdate} rows as synced at ${updateStartTime}...`);
    let updateResult;
    try {
      updateResult = await sequelize.query(updateSql, { transaction: t });
      const updateDuration = Date.now() - updateStartTime;
      logger.debug(`sync_transaction: [STEP4] Update query executed, duration=${updateDuration}ms`);
    } catch (updateError) {
      const updateDuration = Date.now() - updateStartTime;
      logger.error(`sync_transaction: [STEP4] Error executing update query after ${updateDuration}ms`, updateError);
      throw updateError;
    }

    // Process update results
    const processStartTime = Date.now();
    logger.debug(`sync_transaction: [STEP4] Processing update results at ${processStartTime}...`);
    let updatedRows, count;
    try {
      updatedRows = rowsFromQueryResult(updateResult);
      count = updatedRows.map(r => r.id).filter((v) => v !== null).length;
      const processDuration = Date.now() - processStartTime;
      const stepDuration = Date.now() - stepStartTime;
      logger.info(`sync_transaction: [STEP4] Marked ${count} source iclock_transaction rows as is_synced = TRUE (remote), process_duration=${processDuration}ms, total_duration=${stepDuration}ms`);
    } catch (processError) {
      const processErrorDuration = Date.now() - processStartTime;
      logger.error(`sync_transaction: [STEP4] Error processing update results after ${processErrorDuration}ms`, processError);
      throw processError;
    }

    return count;
  } catch (error) {
    const stepDuration = Date.now() - stepStartTime;
    logger.error(`sync_transaction: [STEP4] Error marking source as synced after ${stepDuration}ms`, error);
    throw error;
  }
}

module.exports = markSourceSynced;
