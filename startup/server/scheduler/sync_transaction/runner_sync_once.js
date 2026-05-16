// Sync orchestrator and one-time sync entry point
const logger = require('../../logger');
const { sequelize } = require('../../src/services/databaseService');
// Configuration for sync_transaction
const env = require('../../src/config/env');


const updateTerminalData = require('./step0_updateTerminalData');
const fetchUnsyncedRows = require('./step1_fetchUnsyncedRows');
const ensureEmployeesExist = require('./step2_ensureEmployeesExist');
const insertTransactions = require('./step3_insertTransactions');
const markSourceSynced = require('./step4_markSourceSynced');

/** Run one complete sync cycle */
async function syncOnce(batchSize = env.SYNC_TRANSACTION_BATCH_SIZE) {
  // Validate and sanitize batchSize to ensure it's a valid positive integer
  const validatedBatchSize = Number.isFinite(batchSize) && batchSize > 0 ? Math.trunc(batchSize) : (env.SYNC_TRANSACTION_BATCH_SIZE);
  const syncStartTime = Date.now();
  logger.info(`sync_transaction: [SYNC_ONCE] ===== Starting sync operation with batchSize=${validatedBatchSize} at ${new Date().toISOString()} =====`);

  try {
    const transactionStartTime = Date.now();
    logger.debug(`sync_transaction: [SYNC_ONCE] Beginning database transaction at ${transactionStartTime}`);

    return await sequelize.transaction(async (t) => {
      const transactionSetupTime = Date.now() - transactionStartTime;
      logger.debug(`sync_transaction: [SYNC_ONCE] Database transaction started - batchSize=${validatedBatchSize}, setup_time=${transactionSetupTime}ms`);

      try {
        // Step 0
        const step0StartTime = Date.now();
        logger.info(`sync_transaction: [SYNC_ONCE] [STEP0] Starting step 0: Update terminal data at ${step0StartTime}...`);
        let updatedTerminalCount = 0;
        try {
          const step0Result = await updateTerminalData(t);
          updatedTerminalCount = step0Result.updatedCount;
          const step0EndTime = Date.now();
          const step0Duration = step0EndTime - step0StartTime;
          logger.info(`sync_transaction: [SYNC_ONCE] [STEP0] Completed - updated ${updatedTerminalCount} terminals, duration=${step0Duration}ms`);
        } catch (step0Error) {
          const step0ErrorDuration = Date.now() - step0StartTime;
          logger.error(`sync_transaction: [SYNC_ONCE] [STEP0] Error updating terminal data after ${step0ErrorDuration}ms`, step0Error);
          throw step0Error;
        }

        // Step 1
        const step1StartTime = Date.now();
        logger.info(`sync_transaction: [SYNC_ONCE] [STEP1] Starting step 1: Fetch unsynced rows at ${step1StartTime}...`);
        let rows;
        try {
          rows = await fetchUnsyncedRows(validatedBatchSize, t);
          const step1EndTime = Date.now();
          const step1Duration = step1EndTime - step1StartTime;
          const selectedCount = Array.isArray(rows) ? rows.length : 0;
          logger.info(`sync_transaction: [SYNC_ONCE] [STEP1] Completed - selected ${selectedCount} unsynced rows (batchSize=${validatedBatchSize}), duration=${step1Duration}ms`);

          if (selectedCount === 0) {
            logger.info(`sync_transaction: [SYNC_ONCE] [STEP1] No rows to process - committing transaction early, selectedCount=${selectedCount}`);
            return 0;
          }
        } catch (step1Error) {
          const step1ErrorDuration = Date.now() - step1StartTime;
          logger.error(`sync_transaction: [SYNC_ONCE] [STEP1] Error fetching unsynced rows after ${step1ErrorDuration}ms`, step1Error);
          throw step1Error;
        }

        // Step 2
        const step2StartTime = Date.now();
        logger.info(`sync_transaction: [SYNC_ONCE] [STEP2] Starting step 2: Ensure employees exist at ${step2StartTime}...`);
        let pairsCount, insertedCount;
        try {
          const step2Result = await ensureEmployeesExist(rows, t);
          pairsCount = step2Result.pairsCount;
          insertedCount = step2Result.insertedCount;
          const step2EndTime = Date.now();
          const step2Duration = step2EndTime - step2StartTime;
          logger.info(`sync_transaction: [SYNC_ONCE] [STEP2] Completed - pairs=${pairsCount}, newly_inserted=${insertedCount}, duration=${step2Duration}ms`);
        } catch (step2Error) {
          const step2ErrorDuration = Date.now() - step2StartTime;
          logger.error(`sync_transaction: [SYNC_ONCE] [STEP2] Error ensuring employees exist after ${step2ErrorDuration}ms`, step2Error);
          throw step2Error;
        }

        // Step 3
        const step3StartTime = Date.now();
        logger.info(`sync_transaction: [SYNC_ONCE] [STEP3] Starting step 3: Insert transactions at ${step3StartTime}...`);
        let insertedIds, existingIds;
        try {
          const step3Result = await insertTransactions(rows, t);
          insertedIds = step3Result.insertedIds;
          existingIds = step3Result.existingIds;
          const step3EndTime = Date.now();
          const step3Duration = step3EndTime - step3StartTime;
          const previouslyExisting = Math.max(0, existingIds.length - insertedIds.length);
          logger.info(`sync_transaction: [SYNC_ONCE] [STEP3] Completed - inserted=${insertedIds.length}, present_now=${existingIds.length}, previously_existing=${previouslyExisting}, duration=${step3Duration}ms`);
        } catch (step3Error) {
          const step3ErrorDuration = Date.now() - step3StartTime;
          logger.error(`sync_transaction: [SYNC_ONCE] [STEP3] Error inserting transactions after ${step3ErrorDuration}ms`, step3Error);
          throw step3Error;
        }

        // Step 4
        const step4StartTime = Date.now();
        logger.info(`sync_transaction: [SYNC_ONCE] [STEP4] Starting step 4: Mark source rows as synced at ${step4StartTime}...`);
        let markedCount;
        try {
          const unionSet = new Set();
          existingIds.forEach(id => unionSet.add(String(id)));
          insertedIds.forEach(id => unionSet.add(String(id)));
          const syncedIds = Array.from(unionSet);
          logger.debug(`sync_transaction: [SYNC_ONCE] [STEP4] Prepared ${syncedIds.length} IDs to mark as synced`);

          markedCount = await markSourceSynced(syncedIds, t);
          const step4EndTime = Date.now();
          const step4Duration = step4EndTime - step4StartTime;
          logger.info(`sync_transaction: [SYNC_ONCE] [STEP4] Completed - marked ${markedCount} source rows as synced, duration=${step4Duration}ms`);
        } catch (step4Error) {
          const step4ErrorDuration = Date.now() - step4StartTime;
          logger.error(`sync_transaction: [SYNC_ONCE] [STEP4] Error marking source as synced after ${step4ErrorDuration}ms`, step4Error);
          throw step4Error;
        }

        const totalDuration = Date.now() - syncStartTime;
        const selectedCount = Array.isArray(rows) ? rows.length : 0;
        logger.info(`sync_transaction: [SYNC_ONCE] Transaction complete -> terminals_updated=${updatedTerminalCount}, selected=${selectedCount}, employees_checked=${pairsCount}, employees_inserted=${insertedCount}, tx_inserted=${insertedIds.length}, tx_present=${existingIds.length}, marked_synced=${markedCount}, total_time=${totalDuration}ms`);

        return markedCount;
      } catch (transactionError) {
        const transactionErrorDuration = Date.now() - transactionStartTime;
        logger.error(`sync_transaction: [SYNC_ONCE] Error within transaction after ${transactionErrorDuration}ms`, transactionError);
        throw transactionError;
      }
    });
  } catch (error) {
    const totalDuration = Date.now() - syncStartTime;
    logger.error(`sync_transaction: [SYNC_ONCE] ❌ Error during sync with batchSize=${validatedBatchSize} after ${totalDuration}ms`, error);
    return 0;
  } finally {
    const totalDuration = Date.now() - syncStartTime;
    logger.debug(`sync_transaction: [SYNC_ONCE] ===== Sync operation with batchSize=${validatedBatchSize} ended - total_time=${totalDuration}ms =====`);
  }
}

// If this file is run directly (e.g. `npm run transaction-sync`), execute one
// sync cycle and exit. The factory handles db auth, error logging, and exit
// codes; this file just hands it the syncOnce function.
if (require.main === module) {
  const { runOnceStandalone } = require('../lib/standaloneSchedulerFactory');
  runOnceStandalone({
    name: 'sync_transaction',
    syncOnce
  });
}

// Export for use by scheduler
module.exports = syncOnce;
