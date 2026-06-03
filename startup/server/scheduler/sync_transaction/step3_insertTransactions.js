// Step 3: Insert transactions into nbnext_common_transaction using dblink
const logger = require('../../logger');
const { rowsFromQueryResult, buildInListParams } = require('./utils');
const { sequelize } = require('../../src/services/databaseService');
// Configuration for sync_transaction
const env = require('../../src/config/env');

// Prepare a safe SQL literal for the dblink connection string
const DBLINK_CONN_LITERAL = env.DBLINK_CONNECTION.replace(/'/g, '\'\'');


async function insertTransactions(rows, t) {
  const stepStartTime = Date.now();
  logger.info(`sync_transaction: [STEP3] Starting transaction insertion for ${Array.isArray(rows) ? rows.length : 0} rows...`);

  try {
    if (!rows || rows.length === 0) {
      logger.info(`sync_transaction: [STEP3] No transactions to insert - rowsCount=${rows ? rows.length : 0}`);
      return { insertedIds: [], existingIds: [] };
    }

    // Extract IDs
    const extractStartTime = Date.now();
    const rowsCountForExtract = Array.isArray(rows) ? rows.length : 0;
    logger.debug(`sync_transaction: [STEP3] Extracting transaction IDs from ${rowsCountForExtract} rows at ${extractStartTime}...`);
    let ids;
    try {
      ids = rows.map(r => r.id);
      const extractDuration = Date.now() - extractStartTime;
      logger.debug(`sync_transaction: [STEP3] Extracted ${ids.length} transaction IDs, duration=${extractDuration}ms`);
    } catch (extractError) {
      const extractErrorDuration = Date.now() - extractStartTime;
      logger.error(`sync_transaction: [STEP3] Error extracting transaction IDs after ${extractErrorDuration}ms`, extractError);
      throw extractError;
    }

    // Extract unique terminal_sn values for logging and validation
    // Note: Actual terminal_id mapping is done via LEFT JOIN in the INSERT query
    const terminalMappingStartTime = Date.now();
    logger.debug(`sync_transaction: [STEP3] Extracting unique terminal_sn values for validation at ${terminalMappingStartTime}...`);
    try {
      // Extract unique terminal_sn values from rows
      const uniqueTerminalSns = [...new Set(rows.map(r => r.terminal_sn).filter(Boolean))];
      const uniqueSnCount = uniqueTerminalSns.length;
      logger.info(`sync_transaction: [STEP3] Found ${uniqueSnCount} unique terminal_sn values - terminal_id will be resolved via JOIN with nbnext_common_device`);

      if (uniqueSnCount > 0) {
        // Query nbnext_common_device to verify terminals exist (for logging)
        const terminalParams = buildInListParams(uniqueTerminalSns, 'sn');
        const terminalListSql = terminalParams.listSql;
        const terminalReplacements = terminalParams.replacements;

        const terminalQuerySql = `SELECT id, sn FROM nbnext_common_device WHERE sn IN (${terminalListSql});`;
        const terminalQueryResult = await sequelize.query(terminalQuerySql, {
          transaction: t,
          replacements: terminalReplacements,
          type: sequelize.QueryTypes.SELECT
        });

        const terminalMappingDuration = Date.now() - terminalMappingStartTime;
        const mappedCount = Array.isArray(terminalQueryResult) ? terminalQueryResult.length : 0;
        logger.debug(`sync_transaction: [STEP3] Terminal validation complete - ${mappedCount}/${uniqueSnCount} terminals found in nbnext_common_device, duration=${terminalMappingDuration}ms`);

        if (mappedCount < uniqueSnCount) {
          const missingCount = uniqueSnCount - mappedCount;
          logger.warn(`sync_transaction: [STEP3] ${missingCount} terminal_sn values not found in nbnext_common_device - terminal_id will be NULL for those transactions`);
        }
      } else {
        const terminalMappingDuration = Date.now() - terminalMappingStartTime;
        logger.debug(`sync_transaction: [STEP3] No terminal_sn values found in transactions, duration=${terminalMappingDuration}ms`);
      }
    } catch (terminalMappingError) {
      const terminalMappingErrorDuration = Date.now() - terminalMappingStartTime;
      logger.error(`sync_transaction: [STEP3] Error during terminal validation (will continue with INSERT), duration=${terminalMappingErrorDuration}ms`, terminalMappingError);
      // Don't throw - continue with INSERT, terminal_id will be NULL if mapping fails
    }

    // Build parameters
    const paramStartTime = Date.now();
    const idsCountForParams = ids.length;
    logger.debug(`sync_transaction: [STEP3] Building IN list parameters for ${idsCountForParams} IDs at ${paramStartTime}...`);
    let listSql, replacements;
    try {
      const params = buildInListParams(ids, 'id');
      listSql = params.listSql;
      replacements = params.replacements;
      const paramDuration = Date.now() - paramStartTime;
      logger.debug(`sync_transaction: [STEP3] Built parameters for ${ids.length} IDs, duration=${paramDuration}ms`);
    } catch (paramError) {
      const paramErrorDuration = Date.now() - paramStartTime;
      logger.error(`sync_transaction: [STEP3] Error building parameters after ${paramErrorDuration}ms`, paramError);
      throw paramError;
    }

    const transactionsCount = ids.length;
    logger.info(`sync_transaction: [STEP3] Inserting ${transactionsCount} transactions into nbnext_common_transaction (ON CONFLICT DO NOTHING, filtered by valid employees)...`);

    // Build sanitized IDs for dblink query
    const sanitizedIds = ids
      .map((v) => {
        const n = Number(v);
        return Number.isFinite(n) ? Math.trunc(n) : null;
      })
      .filter((v) => v !== null)
      .join(', ');

    // Insert new transactions using dblink with INNER JOIN to nbnext_personnel_employee
    // and INNER JOIN to nbnext_common_device so we only insert when both employee and terminal exist.
    // terminal_id is mapped by terminal serial number (rt.terminal_sn = nt.sn).
    const insertSql = `
    INSERT INTO nbnext_common_transaction (
      id, emp_code, punch_time, punch_state, verify_type, terminal_sn,
      terminal_alias, area_alias, area_name, source, is_attendance, upload_time,
      emp_id, company_id, is_manual, terminal_id
    )
    SELECT 
      rt.id, rt.emp_code, rt.punch_time, rt.punch_state, rt.verify_type, rt.terminal_sn,
      rt.terminal_alias, rt.area_alias, COALESCE(nt.area_name, rt.area_alias, '') AS area_name, rt.source, rt.is_attendance, rt.upload_time,
      e.id AS emp_id, rt.company_id, rt.is_manual,
      nt.id AS terminal_id
    FROM dblink(
      '${DBLINK_CONN_LITERAL}',
      'SELECT 
        id, emp_code, punch_time, punch_state, verify_type, terminal_sn,
        terminal_alias, area_alias, source, is_attendance, upload_time,
        emp_id, company_id, is_manual
       FROM iclock_transaction 
       WHERE id IN (${sanitizedIds})'
    ) AS rt(
      id INTEGER,
      emp_code CHARACTER VARYING,
      punch_time TIMESTAMP WITH TIME ZONE,
      punch_state CHARACTER VARYING,
      verify_type INTEGER,
      terminal_sn CHARACTER VARYING,
      terminal_alias CHARACTER VARYING,
      area_alias CHARACTER VARYING,
      source SMALLINT,
      is_attendance SMALLINT,
      upload_time TIMESTAMP WITH TIME ZONE,
      emp_id CHARACTER VARYING,
      company_id UUID,
      is_manual BOOLEAN
    )
    INNER JOIN nbnext_personnel_employee e ON rt.emp_code::text = e.emp_code::text AND rt.company_id = e.company_id
    INNER JOIN nbnext_common_device nt ON rt.terminal_sn = nt.sn
    ON CONFLICT (id) DO NOTHING
    RETURNING id;
  `;

    // Execute insert query
    const insertStartTime = Date.now();
    const idsCountForInsert = ids.length;
    logger.debug(`sync_transaction: [STEP3] Executing insert query for ${idsCountForInsert} IDs at ${insertStartTime}...`);
    let insertResult;
    try {
      insertResult = await sequelize.query(insertSql, {
        transaction: t
      });
      const insertDuration = Date.now() - insertStartTime;
      logger.debug(`sync_transaction: [STEP3] Insert query executed, duration=${insertDuration}ms`);
    } catch (insertError) {
      const insertDuration = Date.now() - insertStartTime;
      const originalMessage = insertError.original ? insertError.original.message : insertError.message;
      const originalDetail = insertError.original ? insertError.original.detail : undefined;
      const originalCode = insertError.original ? insertError.original.code : undefined;
      logger.error(
        `sync_transaction: [STEP3] Error executing insert query after ${insertDuration}ms - ${originalMessage}${originalDetail ? ` (detail: ${originalDetail})` : ''}${originalCode ? ` code=${originalCode}` : ''}`,
        insertError
      );
      throw insertError;
    }

    // Process insert results
    const processInsertStartTime = Date.now();
    logger.debug(`sync_transaction: [STEP3] Processing insert results at ${processInsertStartTime}...`);
    let insertedRows, insertedIds;
    try {
      insertedRows = rowsFromQueryResult(insertResult);
      insertedIds = insertedRows.map(r => r.id).filter(Boolean);
      const processInsertDuration = Date.now() - processInsertStartTime;
      logger.debug(`sync_transaction: [STEP3] Processed insert results - ${insertedIds.length} inserted, duration=${processInsertDuration}ms`);
    } catch (processError) {
      const processInsertErrorDuration = Date.now() - processInsertStartTime;
      logger.error(`sync_transaction: [STEP3] Error processing insert results after ${processInsertErrorDuration}ms`, processError);
      throw processError;
    }

    // Fetch all ids that now exist in target
    const existingStartTime = Date.now();
    logger.debug(`sync_transaction: [STEP3] Fetching existing transaction IDs at ${existingStartTime}...`);
    const existingSql = `SELECT id FROM nbnext_common_transaction WHERE id::text IN (${listSql});`;
    let existingResult;
    try {
      existingResult = await sequelize.query(existingSql, {
        transaction: t,
        replacements,
        type: sequelize.QueryTypes.SELECT
      });
      const existingDuration = Date.now() - existingStartTime;
      logger.debug(`sync_transaction: [STEP3] Existing IDs query executed, duration=${existingDuration}ms`);
    } catch (existingError) {
      const existingDuration = Date.now() - existingStartTime;
      logger.error(`sync_transaction: [STEP3] Error fetching existing IDs after ${existingDuration}ms`, existingError);
      throw existingError;
    }

    // Process existing results
    const processExistingStartTime = Date.now();
    logger.debug(`sync_transaction: [STEP3] Processing existing results at ${processExistingStartTime}...`);
    let existingRows, existingIds;
    try {
      existingRows = rowsFromQueryResult(existingResult);
      existingIds = existingRows.map(r => r.id);
      const processExistingDuration = Date.now() - processExistingStartTime;
      logger.debug(`sync_transaction: [STEP3] Processed existing results - ${existingIds.length} existing, duration=${processExistingDuration}ms`);
    } catch (processError) {
      const processExistingErrorDuration = Date.now() - processExistingStartTime;
      logger.error(`sync_transaction: [STEP3] Error processing existing results after ${processExistingErrorDuration}ms`, processError);
      throw processError;
    }

    const stepDuration = Date.now() - stepStartTime;
    const previouslyExisting = Math.max(0, existingIds.length - insertedIds.length);
    logger.info(`sync_transaction: [STEP3] Transactions insertion complete - inserted=${insertedIds.length}, present_now=${existingIds.length}, previously_existing=${previouslyExisting}, duration=${stepDuration}ms`);

    return { insertedIds, existingIds };
  } catch (error) {
    const stepDuration = Date.now() - stepStartTime;
    logger.error(`sync_transaction: [STEP3] Error inserting transactions after ${stepDuration}ms`, error);
    throw error;
  }
}

module.exports = insertTransactions;
