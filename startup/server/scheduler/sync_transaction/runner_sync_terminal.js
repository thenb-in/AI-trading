// Terminal-specific sync orchestrator with date and terminal SN filtering
const logger = require('../../logger');
const { parseDate, formatDateToString } = require('../../src/utils/dateUtils');
const { sequelize } = require('../../src/services/databaseService');

const updateTerminalData = require('./step0_updateTerminalData');
const fetchRowsForTerminal = require('./step1_fetchRowsForTerminal');
const ensureEmployeesExist = require('./step2_ensureEmployeesExist');
const insertTransactions = require('./step3_insertTransactions');
const markSourceSynced = require('./step4_markSourceSynced');

/** Run sync for a specific terminal with date filter (no batch limit) */
async function syncTerminal(terminalSn, startDate, _batchSize = null) {
  const syncStartTime = Date.now();

  // Validate inputs
  if (!terminalSn) {
    throw new Error(`Terminal SN is required ${terminalSn}`);
  }
  if (!startDate) {
    throw new Error(`Start date is required ${startDate}`);
  }

  // Parse and validate start date (local calendar; avoid UTC day shift from toISOString)
  const parsedStartDate = parseDate(startDate);
  if (!parsedStartDate || Number.isNaN(parsedStartDate.getTime())) {
    throw new Error(`Invalid start date: ${startDate}`);
  }

  const startDateStr = formatDateToString(parsedStartDate, 'yyyy-mm-dd');

  logger.info(`sync_transaction: [SYNC_TERMINAL] ===== Starting terminal sync operation for SN=${terminalSn}, startDate=${startDateStr} (no batch limit) at ${new Date().toISOString()} =====`);

  try {
    const transactionStartTime = Date.now();
    logger.debug(`sync_transaction: [SYNC_TERMINAL] Beginning database transaction at ${transactionStartTime}`);

    return await sequelize.transaction(async (t) => {
      const transactionSetupTime = Date.now() - transactionStartTime;
      logger.debug(`sync_transaction: [SYNC_TERMINAL] Database transaction started - terminalSn=${terminalSn}, startDate=${startDateStr} (no batch limit), setup_time=${transactionSetupTime}ms`);

      try {
        // Step 0
        const step0StartTime = Date.now();
        logger.info(`sync_transaction: [SYNC_TERMINAL] [STEP0] Starting step 0: Update terminal data at ${step0StartTime}...`);
        let updatedTerminalCount = 0;
        try {
          const step0Result = await updateTerminalData(t);
          updatedTerminalCount = step0Result.updatedCount;
          const step0EndTime = Date.now();
          const step0Duration = step0EndTime - step0StartTime;
          logger.info(`sync_transaction: [SYNC_TERMINAL] [STEP0] Completed - updated ${updatedTerminalCount} terminals, duration=${step0Duration}ms`);
        } catch (step0Error) {
          const step0ErrorDuration = Date.now() - step0StartTime;
          logger.error(`sync_transaction: [SYNC_TERMINAL] [STEP0] Error updating terminal data after ${step0ErrorDuration}ms`, step0Error);
          throw step0Error;
        }

        // Step 1 - Fetch all rows for specific terminal and date
        const step1StartTime = Date.now();
        logger.info(`sync_transaction: [SYNC_TERMINAL] [STEP1] Starting step 1: Fetch all rows for terminal ${terminalSn} from ${startDateStr} at ${step1StartTime}...`);
        let rows;
        try {
          rows = await fetchRowsForTerminal(terminalSn, startDateStr, null, t);
          const step1EndTime = Date.now();
          const step1Duration = step1EndTime - step1StartTime;
          const selectedCount = Array.isArray(rows) ? rows.length : 0;
          logger.info(`sync_transaction: [SYNC_TERMINAL] [STEP1] Completed - selected ${selectedCount} rows (terminalSn=${terminalSn}, startDate=${startDateStr}, no batch limit), duration=${step1Duration}ms`);

          if (selectedCount === 0) {
            logger.info(`sync_transaction: [SYNC_TERMINAL] [STEP1] No rows to process - committing transaction early, selectedCount=${selectedCount}`);
            return 0;
          }
        } catch (step1Error) {
          const step1ErrorDuration = Date.now() - step1StartTime;
          logger.error(`sync_transaction: [SYNC_TERMINAL] [STEP1] Error fetching rows after ${step1ErrorDuration}ms`, step1Error);
          throw step1Error;
        }

        // Step 2
        const step2StartTime = Date.now();
        logger.info(`sync_transaction: [SYNC_TERMINAL] [STEP2] Starting step 2: Ensure employees exist at ${step2StartTime}...`);
        let pairsCount, insertedCount;
        try {
          const step2Result = await ensureEmployeesExist(rows, t);
          pairsCount = step2Result.pairsCount;
          insertedCount = step2Result.insertedCount;
          const step2EndTime = Date.now();
          const step2Duration = step2EndTime - step2StartTime;
          logger.info(`sync_transaction: [SYNC_TERMINAL] [STEP2] Completed - pairs=${pairsCount}, newly_inserted=${insertedCount}, duration=${step2Duration}ms`);
        } catch (step2Error) {
          const step2ErrorDuration = Date.now() - step2StartTime;
          logger.error(`sync_transaction: [SYNC_TERMINAL] [STEP2] Error ensuring employees exist after ${step2ErrorDuration}ms`, step2Error);
          throw step2Error;
        }

        // Step 3
        const step3StartTime = Date.now();
        logger.info(`sync_transaction: [SYNC_TERMINAL] [STEP3] Starting step 3: Insert transactions at ${step3StartTime}...`);
        let insertedIds, existingIds;
        try {
          const step3Result = await insertTransactions(rows, t);
          insertedIds = step3Result.insertedIds;
          existingIds = step3Result.existingIds;
          const step3EndTime = Date.now();
          const step3Duration = step3EndTime - step3StartTime;
          const previouslyExisting = Math.max(0, existingIds.length - insertedIds.length);
          logger.info(`sync_transaction: [SYNC_TERMINAL] [STEP3] Completed - inserted=${insertedIds.length}, present_now=${existingIds.length}, previously_existing=${previouslyExisting}, duration=${step3Duration}ms`);
        } catch (step3Error) {
          const step3ErrorDuration = Date.now() - step3StartTime;
          logger.error(`sync_transaction: [SYNC_TERMINAL] [STEP3] Error inserting transactions after ${step3ErrorDuration}ms`, step3Error);
          throw step3Error;
        }

        // Step 4
        const step4StartTime = Date.now();
        logger.info(`sync_transaction: [SYNC_TERMINAL] [STEP4] Starting step 4: Mark source rows as synced at ${step4StartTime}...`);
        let markedCount;
        try {
          const unionSet = new Set();
          existingIds.forEach(id => unionSet.add(String(id)));
          insertedIds.forEach(id => unionSet.add(String(id)));
          const syncedIds = Array.from(unionSet);
          logger.debug(`sync_transaction: [SYNC_TERMINAL] [STEP4] Prepared ${syncedIds.length} IDs to mark as synced`);

          markedCount = await markSourceSynced(syncedIds, t);
          const step4EndTime = Date.now();
          const step4Duration = step4EndTime - step4StartTime;
          logger.info(`sync_transaction: [SYNC_TERMINAL] [STEP4] Completed - marked ${markedCount} source rows as synced, duration=${step4Duration}ms`);
        } catch (step4Error) {
          const step4ErrorDuration = Date.now() - step4StartTime;
          logger.error(`sync_transaction: [SYNC_TERMINAL] [STEP4] Error marking source as synced after ${step4ErrorDuration}ms`, step4Error);
          throw step4Error;
        }

        const totalDuration = Date.now() - syncStartTime;
        const selectedCount = Array.isArray(rows) ? rows.length : 0;
        logger.info(`sync_transaction: [SYNC_TERMINAL] Transaction complete -> terminals_updated=${updatedTerminalCount}, selected=${selectedCount}, employees_checked=${pairsCount}, employees_inserted=${insertedCount}, tx_inserted=${insertedIds.length}, tx_present=${existingIds.length}, marked_synced=${markedCount}, total_time=${totalDuration}ms`);

        return markedCount;
      } catch (transactionError) {
        const transactionErrorDuration = Date.now() - transactionStartTime;
        logger.error(`sync_transaction: [SYNC_TERMINAL] Error within transaction after ${transactionErrorDuration}ms`, transactionError);
        throw transactionError;
      }
    });
  } catch (error) {
    const totalDuration = Date.now() - syncStartTime;
    logger.error(`sync_transaction: [SYNC_TERMINAL] ❌ Error during sync for terminal ${terminalSn} with startDate=${startDateStr} after ${totalDuration}ms`, error);
    throw error;
  } finally {
    const totalDuration = Date.now() - syncStartTime;
    logger.debug(`sync_transaction: [SYNC_TERMINAL] ===== Sync operation for terminal ${terminalSn} with startDate=${startDateStr} (no batch limit) ended - total_time=${totalDuration}ms =====`);
  }
}

module.exports = syncTerminal;

