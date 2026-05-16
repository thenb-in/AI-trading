// Step 1: Fetch unsynced records from remote database using dblink
const logger = require('../../logger');
const { rowsFromQueryResult } = require('./utils');
const { sequelize } = require('../../src/services/databaseService');
// Configuration for sync_transaction
const env = require('../../src/config/env');

// Prepare a safe SQL literal for the dblink connection string
const DBLINK_CONN_LITERAL = env.DBLINK_CONNECTION.replace(/'/g, '\'\'');

/** Escape single quotes for use inside a SQL string literal */
function escapeSqlLiteral(value) {
  if (value === null){
    logger.warn(`sync_transaction: [STEP1] Error escaping SQL literal - value is null ${value}`);
    return '';
  }
  return String(value).replace(/'/g, '\'\'');
}

async function fetchUnsyncedRows(batchSize, t) {
  const stepStartTime = Date.now();
  // Validate and sanitize batchSize to ensure it's a valid positive integer
  const validatedBatchSize = Number.isFinite(batchSize) && batchSize > 0 ? Math.trunc(batchSize) : 1000;
  logger.info(`sync_transaction: [STEP1] Starting fetch of up to ${validatedBatchSize} unsynced rows from remote database using dblink...`);

  try {
    // Fetch terminal serial numbers that exist in our DB - only sync transactions for these terminals
    const terminalSnStartTime = Date.now();
    let terminalSns = [];
    try {
      const terminalResult = await sequelize.query(
        'SELECT sn FROM nbnext_iclock_terminal WHERE sn IS NOT NULL AND sn != \'\'',
        { transaction: t, type: sequelize.QueryTypes.SELECT }
      );
      terminalSns = (terminalResult || []).map((row) => row.sn).filter(Boolean);
      const terminalSnDuration = Date.now() - terminalSnStartTime;
      logger.debug(`sync_transaction: [STEP1] Loaded ${terminalSns.length} terminal serial numbers from nbnext_iclock_terminal, duration=${terminalSnDuration}ms`);
    } catch (terminalSnError) {
      const terminalSnErrorDuration = Date.now() - terminalSnStartTime;
      logger.error(`sync_transaction: [STEP1] Error loading terminal serial numbers after ${terminalSnErrorDuration}ms`, terminalSnError);
      throw terminalSnError;
    }

    if (terminalSns.length === 0) {
      logger.info(`sync_transaction: [STEP1] No terminals in nbnext_iclock_terminal - skipping fetch (0 rows) ${terminalSns.join(', ')}`);
      return [];
    }

    // Build safe IN list for remote query (quoted SNs for remote SQL)
    const terminalInList = terminalSns.map((sn) => `'${escapeSqlLiteral(sn)}'`).join(', ');
    const terminalFilterClause = `AND terminal_sn IN (${terminalInList})`;
    // Inner query is passed to dblink as a single-quoted string in the outer SQL; escape ' for outer literal
    const innerQueryEscaped = terminalFilterClause.replace(/'/g, '\'\'');

    const query = `
      SELECT id, emp_code, punch_time, punch_state, verify_type, terminal_sn,
             terminal_alias, area_alias, source, is_attendance, upload_time,
             emp_id, company_id, is_manual
      FROM dblink(
        '${DBLINK_CONN_LITERAL}',
        'SELECT 
          id, emp_code, punch_time, punch_state, verify_type, terminal_sn,
          terminal_alias, area_alias, source, is_attendance, upload_time,
          emp_id, company_id, is_manual
         FROM iclock_transaction
         WHERE is_synced = FALSE
         ${innerQueryEscaped}
         ORDER BY id
         LIMIT ${validatedBatchSize}'
      ) AS remote_transactions(
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
    `;

    logger.debug(`sync_transaction: [STEP1] Executing dblink query with batchSize=${validatedBatchSize}...`);
    const queryStartTime = Date.now();

    let result;
    try {
      result = await sequelize.query(query, {
        transaction: t,
        type: sequelize.QueryTypes.SELECT
      });
      const queryDuration = Date.now() - queryStartTime;
      logger.debug(`sync_transaction: [STEP1] Query executed successfully, duration=${queryDuration}ms`);
    } catch (queryError) {
      const queryDuration = Date.now() - queryStartTime;
      logger.error(`sync_transaction: [STEP1] Error executing dblink query after ${queryDuration}ms`, queryError);
      throw queryError;
    }

    const processStartTime = Date.now();
    logger.debug(`sync_transaction: [STEP1] Processing query result at ${processStartTime}...`);
    let rows;
    try {
      rows = rowsFromQueryResult(result);
      const processDuration = Date.now() - processStartTime;
      const rowCount = Array.isArray(rows) ? rows.length : 0;
      logger.debug(`sync_transaction: [STEP1] Processed query result - found ${rowCount} rows, duration=${processDuration}ms`);
    } catch (processError) {
      logger.error('sync_transaction: [STEP1] Error processing query result', processError);
      throw processError;
    }

    const stepDuration = Date.now() - stepStartTime;
    const rowCount = Array.isArray(rows) ? rows.length : 0;
    logger.info(`sync_transaction: [STEP1] Completed successfully - fetched ${rowCount} unsynced rows (batchSize=${validatedBatchSize}), duration=${stepDuration}ms`);

    return rows;
  } catch (error) {
    const stepDuration = Date.now() - stepStartTime;
    logger.error(`sync_transaction: [STEP1] Error fetching unsynced rows after ${stepDuration}ms`, error);
    throw error;
  }
}

module.exports = fetchUnsyncedRows;
