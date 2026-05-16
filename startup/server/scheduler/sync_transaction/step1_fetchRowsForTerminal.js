// Step 1: Fetch all records for a specific terminal and date from remote database using dblink (regardless of sync status)
const logger = require('../../logger');
const { rowsFromQueryResult } = require('./utils');
const { sequelize } = require('../../src/services/databaseService');
const { parseDate, formatDateToString } = require('../../src/utils/dateUtils');
// Configuration for sync_transaction
const env = require('../../src/config/env');

// Prepare a safe SQL literal for the dblink connection string
const DBLINK_CONN_LITERAL = env.DBLINK_CONNECTION.replace(/'/g, '\'\'');

async function fetchRowsForTerminal(terminalSn, startDate, batchSize, t) {
  const stepStartTime = Date.now();

  // Validate inputs
  if (!terminalSn) {
    throw new Error(`Terminal SN is required get ${terminalSn}`);
  }
  if (!startDate) {
    throw new Error(`Start date is required get ${startDate}`);
  }

  // Parse start date (local calendar); use yyyy-mm-dd for SQL literal (no UTC shift from toISOString)
  const parsedStartDate = parseDate(startDate);
  if (!parsedStartDate || Number.isNaN(parsedStartDate.getTime())) {
    throw new Error(`Invalid start date: ${startDate}`);
  }
  const startDateYmd = formatDateToString(parsedStartDate, 'yyyy-mm-dd');

  logger.info(`sync_transaction: [STEP1_TERMINAL] Starting fetch of all rows from remote database for terminal ${terminalSn} from date ${startDate} using dblink (all records, regardless of sync status, no batch limit)...`);

  try {
    // Escape terminalSn and date for SQL injection prevention
    // In PostgreSQL dblink, we need to escape single quotes by doubling them
    // Since the value is inside a string literal that's inside another string literal,
    // we need: outer string '...' contains inner string '...' which contains value 'value'
    // So: '... ''value'' ...' becomes SQL: ... 'value' ...
    const escapedTerminalSn = terminalSn.replace(/'/g, '\'\'');
    const escapedStartDate = startDateYmd.replace(/'/g, '\'\'');

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
         WHERE terminal_sn = ''${escapedTerminalSn}''
           AND punch_time >= ''${escapedStartDate}''
         ORDER BY id'
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

    logger.debug(`sync_transaction: [STEP1_TERMINAL] Executing dblink query with terminalSn=${terminalSn}, startDate=${startDate} (fetching all records, no batch limit)...`);
    const queryStartTime = Date.now();

    let result;
    try {
      result = await sequelize.query(query, {
        transaction: t,
        type: sequelize.QueryTypes.SELECT
      });
      const queryDuration = Date.now() - queryStartTime;
      logger.debug(`sync_transaction: [STEP1_TERMINAL] Query executed successfully, duration=${queryDuration}ms`);
    } catch (queryError) {
      const queryDuration = Date.now() - queryStartTime;
      logger.error(`sync_transaction: [STEP1_TERMINAL] Error executing dblink query after ${queryDuration}ms`, queryError);
      throw queryError;
    }

    const processStartTime = Date.now();
    logger.debug(`sync_transaction: [STEP1_TERMINAL] Processing query result at ${processStartTime}...`);
    let rows;
    try {
      rows = rowsFromQueryResult(result);
      const processDuration = Date.now() - processStartTime;
      const rowCount = Array.isArray(rows) ? rows.length : 0;
      logger.debug(`sync_transaction: [STEP1_TERMINAL] Processed query result - found ${rowCount} rows (all records for terminal ${terminalSn} from ${startDate}), duration=${processDuration}ms`);
    } catch (processError) {
      logger.error('sync_transaction: [STEP1_TERMINAL] Error processing query result', processError);
      throw processError;
    }

    const stepDuration = Date.now() - stepStartTime;
    const rowCount = Array.isArray(rows) ? rows.length : 0;
    logger.info(`sync_transaction: [STEP1_TERMINAL] Completed successfully - fetched ${rowCount} rows (terminalSn=${terminalSn}, startDate=${startDate}, no batch limit), duration=${stepDuration}ms`);

    return rows;
  } catch (error) {
    const stepDuration = Date.now() - stepStartTime;
    logger.error(`sync_transaction: [STEP1_TERMINAL] Error fetching rows after ${stepDuration}ms`, error);
    throw error;
  }
}

module.exports = fetchRowsForTerminal;

