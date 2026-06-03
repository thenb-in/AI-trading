// Step 0: Update terminal data from remote iclock_terminal to local nbnext_common_device
const logger = require('../../logger');
const { rowsFromQueryResult } = require('./utils');
const { sequelize } = require('../../src/services/databaseService');
// Configuration for sync_transaction
const env = require('../../src/config/env');

// Prepare a safe SQL literal for the dblink connection string
const DBLINK_CONN_LITERAL = env.DBLINK_CONNECTION.replace(/'/g, '\'\'');

async function updateTerminalData(t) {
  const stepStartTime = Date.now();
  logger.info(`sync_transaction: [STEP0] Starting terminal data update from remote iclock_terminal at ${stepStartTime}...`);

  try {
    // Fetch all terminals from remote and update local by matching on sn
    const updateStartTime = Date.now();
    logger.debug(`sync_transaction: [STEP0] Preparing update SQL to sync terminal data at ${updateStartTime}...`);

    const updateSql = `
      UPDATE nbnext_common_device AS local
      SET
        create_time = remote.create_time,
        create_user = remote.create_user,
        change_time = remote.change_time,
        change_user = remote.change_user,
        status = remote.status,
        alias = remote.alias,
        ip_address = remote.ip_address,
        real_ip = remote.real_ip,
        state = remote.state,
        terminal_tz = remote.terminal_tz,
        heartbeat = remote.heartbeat,
        transfer_mode = remote.transfer_mode,
        transfer_interval = remote.transfer_interval,
        transfer_time = remote.transfer_time,
        product_type = remote.product_type,
        is_attendance = remote.is_attendance,
        is_registration = remote.is_registration,
        purpose = remote.purpose,
        controller_type = remote.controller_type,
        authentication = remote.authentication,
        style = remote.style,
        upload_flag = remote.upload_flag,
        fw_ver = remote.fw_ver,
        push_protocol = remote.push_protocol,
        push_ver = remote.push_ver,
        language = remote.language,
        is_tft = remote.is_tft,
        terminal_name = remote.terminal_name,
        platform = remote.platform,
        oem_vendor = remote.oem_vendor,
        log_stamp = remote.log_stamp,
        op_log_stamp = remote.op_log_stamp,
        capture_stamp = remote.capture_stamp,
        user_count = remote.user_count,
        user_capacity = remote.user_capacity,
        photo_func_on = remote.photo_func_on,
        transaction_count = remote.transaction_count,
        transaction_capacity = remote.transaction_capacity,
        fp_func_on = remote.fp_func_on,
        fp_count = remote.fp_count,
        fp_capacity = remote.fp_capacity,
        fp_alg_ver = remote.fp_alg_ver,
        face_func_on = remote.face_func_on,
        face_count = remote.face_count,
        face_capacity = remote.face_capacity,
        face_alg_ver = remote.face_alg_ver,
        fv_func_on = remote.fv_func_on,
        fv_count = remote.fv_count,
        fv_capacity = remote.fv_capacity,
        fv_alg_ver = remote.fv_alg_ver,
        palm_func_on = remote.palm_func_on,
        palm_count = remote.palm_count,
        palm_capacity = remote.palm_capacity,
        palm_alg_ver = remote.palm_alg_ver,
        lock_func = remote.lock_func,
        last_activity = remote.last_activity,
        upload_time = remote.upload_time,
        push_time = remote.push_time,
        is_access = remote.is_access,
        gps_location = remote.gps_location,
        area_name = remote.area_name,
        company_id = remote.company_id,
        device_direction = remote.device_direction
      FROM dblink(
        '${DBLINK_CONN_LITERAL}',
        'SELECT t.id, t.create_time, t.create_user, t.change_time, t.change_user, t.status, t.sn, t.alias, t.ip_address, t.real_ip, t.state, t.terminal_tz, t.heartbeat, t.transfer_mode, t.transfer_interval, t.transfer_time, t.product_type, t.is_attendance, t.is_registration, t.purpose, t.controller_type, t.authentication, t.style, t.upload_flag, t.fw_ver, t.push_protocol, t.push_ver, t.language, t.is_tft, t.terminal_name, t.platform, t.oem_vendor, t.log_stamp, t.op_log_stamp, t.capture_stamp, t.user_count, t.user_capacity, t.photo_func_on, t.transaction_count, t.transaction_capacity, t.fp_func_on, t.fp_count, t.fp_capacity, t.fp_alg_ver, t.face_func_on, t.face_count, t.face_capacity, t.face_alg_ver, t.fv_func_on, t.fv_count, t.fv_capacity, t.fv_alg_ver, t.palm_func_on, t.palm_count, t.palm_capacity, t.palm_alg_ver, t.lock_func, t.last_activity, t.upload_time, t.push_time, t.is_access, t.gps_location, COALESCE(a.area_name, '''') AS area_name, t.company_id, t.device_direction FROM iclock_terminal t LEFT JOIN personnel_area a ON t.area_id = a.id'
      ) AS remote(
        id INTEGER,
        create_time TIMESTAMP WITH TIME ZONE,
        create_user CHARACTER VARYING,
        change_time TIMESTAMP WITH TIME ZONE,
        change_user CHARACTER VARYING,
        status SMALLINT,
        sn CHARACTER VARYING,
        alias CHARACTER VARYING,
        ip_address INET,
        real_ip INET,
        state INTEGER,
        terminal_tz SMALLINT,
        heartbeat INTEGER,
        transfer_mode SMALLINT,
        transfer_interval INTEGER,
        transfer_time CHARACTER VARYING,
        product_type SMALLINT,
        is_attendance SMALLINT,
        is_registration SMALLINT,
        purpose SMALLINT,
        controller_type SMALLINT,
        authentication SMALLINT,
        style CHARACTER VARYING,
        upload_flag CHARACTER VARYING,
        fw_ver CHARACTER VARYING,
        push_protocol CHARACTER VARYING,
        push_ver CHARACTER VARYING,
        language INTEGER,
        is_tft BOOLEAN,
        terminal_name CHARACTER VARYING,
        platform CHARACTER VARYING,
        oem_vendor CHARACTER VARYING,
        log_stamp CHARACTER VARYING,
        op_log_stamp CHARACTER VARYING,
        capture_stamp CHARACTER VARYING,
        user_count INTEGER,
        user_capacity INTEGER,
        photo_func_on BOOLEAN,
        transaction_count INTEGER,
        transaction_capacity INTEGER,
        fp_func_on BOOLEAN,
        fp_count INTEGER,
        fp_capacity INTEGER,
        fp_alg_ver CHARACTER VARYING,
        face_func_on BOOLEAN,
        face_count INTEGER,
        face_capacity INTEGER,
        face_alg_ver CHARACTER VARYING,
        fv_func_on BOOLEAN,
        fv_count INTEGER,
        fv_capacity INTEGER,
        fv_alg_ver CHARACTER VARYING,
        palm_func_on BOOLEAN,
        palm_count INTEGER,
        palm_capacity INTEGER,
        palm_alg_ver CHARACTER VARYING,
        lock_func SMALLINT,
        last_activity TIMESTAMP WITH TIME ZONE,
        upload_time TIMESTAMP WITH TIME ZONE,
        push_time TIMESTAMP WITH TIME ZONE,
        is_access SMALLINT,
        gps_location CHARACTER VARYING,
        area_name CHARACTER VARYING,
        company_id UUID,
        device_direction SMALLINT
      )
      WHERE local.sn = remote.sn
      RETURNING local.id;
    `;

    logger.debug(`sync_transaction: [STEP0] Executing update query at ${updateStartTime}...`);
    let updateResult;
    try {
      updateResult = await sequelize.query(updateSql, {
        transaction: t,
        type: sequelize.QueryTypes.SELECT
      });
      const updateDuration = Date.now() - updateStartTime;
      logger.debug(`sync_transaction: [STEP0] Update query executed successfully, duration=${updateDuration}ms`);
    } catch (updateError) {
      const updateDuration = Date.now() - updateStartTime;
      logger.error(`sync_transaction: [STEP0] Error executing update query after ${updateDuration}ms`, updateError);
      throw updateError;
    }

    const processStartTime = Date.now();
    logger.debug(`sync_transaction: [STEP0] Processing update result at ${processStartTime}...`);
    let updatedRows;
    try {
      updatedRows = rowsFromQueryResult(updateResult);
      const processDuration = Date.now() - processStartTime;
      const updatedCount = Array.isArray(updatedRows) ? updatedRows.length : 0;
      logger.debug(`sync_transaction: [STEP0] Processed update result - updated ${updatedCount} terminals, duration=${processDuration}ms`);
    } catch (processError) {
      logger.error('sync_transaction: [STEP0] Error processing update result', processError);
      throw processError;
    }

    const stepDuration = Date.now() - stepStartTime;
    const updatedCount = Array.isArray(updatedRows) ? updatedRows.length : 0;
    logger.info(`sync_transaction: [STEP0] Completed successfully - updated ${updatedCount} terminals (matched by sn), duration=${stepDuration}ms`);

    return { updatedCount };
  } catch (error) {
    const stepDuration = Date.now() - stepStartTime;
    logger.error(`sync_transaction: [STEP0] Error updating terminal data after ${stepDuration}ms`, error);
    throw error;
  }
}

module.exports = updateTerminalData;

