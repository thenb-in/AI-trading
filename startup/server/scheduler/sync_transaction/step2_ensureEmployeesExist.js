// Step 2: Make sure employees exist in nbnext_personnel_employee using dblink
const logger = require('../../logger');
const { rowsFromQueryResult } = require('./utils');
const { sequelize } = require('../../src/services/databaseService');
// Configuration for sync_transaction
const env = require('../../src/config/env');

// Prepare a safe SQL literal for the dblink connection string
const DBLINK_CONN_LITERAL = env.DBLINK_CONNECTION.replace(/'/g, '\'\'');


async function ensureEmployeesExist(rows, t) {
  const stepStartTime = Date.now();
  logger.info(`sync_transaction: [STEP2] Starting employee existence check for ${Array.isArray(rows) ? rows.length : 0} rows...`);

  try {
    // Extract unique employee pairs
    const extractStartTime = Date.now();
    const rowsCount = Array.isArray(rows) ? rows.length : 0;
    logger.debug(`sync_transaction: [STEP2] Extracting unique (emp_code, company_id) pairs from ${rowsCount} rows at ${extractStartTime}...`);
    const pairs = [];
    const seen = new Set();

    try {
      for (const r of rows) {
        if (r.emp_code === null || r.emp_code === undefined) {
          const empCodeValue = r.emp_code;
          logger.debug(`sync_transaction: [STEP2] Skipping row with null emp_code, emp_code=${empCodeValue}`);
          continue;
        }
        const key = `${r.emp_code}::${r.company_id}`;
        if (!seen.has(key)) {
          seen.add(key);
          pairs.push({ emp_code: r.emp_code, company_id: r.company_id });
        }
      }
      const extractDuration = Date.now() - extractStartTime;
      logger.info(`sync_transaction: [STEP2] Extracted ${pairs.length} unique (emp_code, company_id) pairs to check, duration=${extractDuration}ms`);
    } catch (extractError) {
      const extractErrorDuration = Date.now() - extractStartTime;
      logger.error(`sync_transaction: [STEP2] Error extracting employee pairs after ${extractErrorDuration}ms`, extractError);
      throw extractError;
    }

    if (pairs.length === 0) {
      logger.info(`sync_transaction: [STEP2] No employee pairs to insert - pairsCount=${pairs.length}`);
      return { pairsCount: 0, insertedCount: 0 };
    }

    let totalInserted = 0;

    // Insert missing employees from personnel_employee to nbnext_personnel_employee using dblink
    const pairsCountForInsert = pairs.length;
    logger.debug(`sync_transaction: [STEP2] Preparing insert SQL for ${pairsCountForInsert} missing employees...`);
    const insertSql = `
    INSERT INTO nbnext_personnel_employee (
      create_time, create_user, change_time, change_user, status, id, emp_code,
      first_name, last_name, nickname, passport,
      driver_license_automobile, driver_license_motorcycle, enable_outdoor_management,
      photo, self_password, device_password, dev_privilege, card_no, acc_group,
      acc_timezone, gender, birthday, address, postcode, office_tel, contact_tel,
      mobile, national, religion, title, enroll_sn, ssn, update_time, hire_date,
      verify_mode, city, is_admin, emp_type, enable_att, enable_payroll,
      enable_overtime, enable_holiday, enable_whatsapp, whatsapp_exception,
      whatsapp_punch, deleted, reserved, del_tag, app_status,
      email, enable_sms, sms_exception, sms_punch, last_login, is_active,
      department_id, position_id, company_id, otp, verified_employee,
      app_punch_status, preferences, src
    )
    SELECT 
      create_time, create_user, change_time, change_user, status, id, emp_code,
      first_name, last_name, nickname, passport,
      driver_license_automobile, driver_license_motorcycle, enable_outdoor_management,
      photo, self_password, device_password, dev_privilege, card_no, acc_group,
      acc_timezone, gender, birthday, address, postcode, office_tel, contact_tel,
      mobile, national, religion, title, enroll_sn, ssn, update_time, hire_date,
      verify_mode, city, is_admin, emp_type, enable_att, enable_payroll,
      enable_overtime, enable_holiday, enable_whatsapp, whatsapp_exception,
      whatsapp_punch, deleted, reserved, del_tag, app_status,
      email, enable_sms, sms_exception, sms_punch, last_login, is_active,
      department_id, position_id, company_id, otp, verified_employee,
      app_punch_status, preferences,
      'easywdms'::VARCHAR AS src
    FROM dblink(
      '${DBLINK_CONN_LITERAL}',
      'SELECT 
        create_time, create_user, change_time, change_user, status, id, emp_code,
        first_name, last_name, nickname, passport,
        driver_license_automobile, driver_license_motorcycle, enable_outdoor_management,
        photo, self_password, device_password, dev_privilege, card_no, acc_group,
        acc_timezone, gender, birthday, address, postcode, office_tel, contact_tel,
        mobile, national, religion, title, enroll_sn, ssn, update_time, hire_date,
        verify_mode, city, is_admin, emp_type, enable_att, enable_payroll,
        enable_overtime, enable_holiday, enable_whatsapp, whatsapp_exception,
        whatsapp_punch, deleted, reserved, del_tag, app_status,
        email, enable_sms, sms_exception, sms_punch, last_login, is_active,
        department_id, position_id, company_id, otp, verified_employee,
        app_punch_status, preferences
       FROM personnel_employee WHERE emp_code::text = ''' || :emp_code || ''' AND company_id::text = ''' || :company_id || ''''
    ) AS remote_employee(
      create_time timestamp with time zone,
      create_user character varying,
      change_time timestamp with time zone,
      change_user character varying,
      status smallint,
      id character varying,
      emp_code character varying,
      first_name character varying,
      last_name character varying,
      nickname character varying,
      passport character varying,
      driver_license_automobile character varying,
      driver_license_motorcycle character varying,
      enable_outdoor_management smallint,
      photo character varying,
      self_password character varying,
      device_password character varying,
      dev_privilege integer,
      card_no character varying,
      acc_group character varying,
      acc_timezone character varying,
      gender character varying,
      birthday date,
      address character varying,
      postcode character varying,
      office_tel character varying,
      contact_tel character varying,
      mobile character varying,
      national character varying,
      religion character varying,
      title character varying,
      enroll_sn character varying,
      ssn character varying,
      update_time timestamp with time zone,
      hire_date date,
      verify_mode integer,
      city character varying,
      is_admin boolean,
      emp_type integer,
      enable_att boolean,
      enable_payroll boolean,
      enable_overtime boolean,
      enable_holiday boolean,
      enable_whatsapp boolean,
      whatsapp_exception boolean,
      whatsapp_punch boolean,
      deleted boolean,
      reserved integer,
      del_tag integer,
      app_status smallint,
      email character varying,
      enable_sms boolean,
      sms_exception boolean,
      sms_punch boolean,
      last_login timestamp with time zone,
      is_active boolean,
      department_id integer,
      position_id integer,
      company_id uuid,
      otp character varying,
      verified_employee integer,
      app_punch_status smallint,
      preferences jsonb
    )
    WHERE NOT EXISTS (
      SELECT 1 FROM nbnext_personnel_employee ne
      WHERE ne.emp_code::text = :emp_code AND ne.company_id::text = :company_id
    )
    ON CONFLICT (id) DO NOTHING
    RETURNING id;
  `;

    // Insert each missing employee one by one
    logger.info(`sync_transaction: [STEP2] Processing ${pairs.length} employee pairs for insertion...`);
    const insertStartTime = Date.now();

    for (let i = 0; i < pairs.length; i++) {
      const p = pairs[i];
      const pairStartTime = Date.now();
      logger.debug(`sync_transaction: [STEP2] Processing pair ${i + 1}/${pairs.length}: emp_code=${p.emp_code}, company_id=${p.company_id}`);

      try {
        const replacements = { emp_code: String(p.emp_code), company_id: String(p.company_id) };
        logger.debug(`sync_transaction: [STEP2] Executing insert query for emp_code=${p.emp_code}, company_id=${p.company_id}...`);

        const queryStartTime = Date.now();
        const res = await sequelize.query(insertSql, { transaction: t, replacements });
        const queryDuration = Date.now() - queryStartTime;

        logger.debug(`sync_transaction: [STEP2] Query executed for emp_code=${p.emp_code}, duration=${queryDuration}ms`);

        // const processStartTime = Date.now();
        const inserted = rowsFromQueryResult(res);
        const insertedCount = Array.isArray(inserted) ? inserted.length : 0;
        // const processDuration = Date.now() - processStartTime;

        totalInserted += insertedCount;
        const pairDuration = Date.now() - pairStartTime;

        if (insertedCount > 0) {
          logger.info(`sync_transaction: [STEP2] Inserted employee emp_code=${p.emp_code} company=${p.company_id}, duration=${pairDuration}ms`);
        } else {
          logger.debug(`sync_transaction: [STEP2] Employee already present emp_code=${p.emp_code} company=${p.company_id}, duration=${pairDuration}ms`);
        }
      } catch (err) {
        const pairDuration = Date.now() - pairStartTime;
        logger.error(`sync_transaction: [STEP2] Error inserting employee emp_code=${p.emp_code} company=${p.company_id} after ${pairDuration}ms`, err);
        // Continue with next pair instead of failing entire step
        const continueAfterError = true;
        logger.warn(`sync_transaction: [STEP2] Continuing with next employee pair after error, continue=${continueAfterError}...`);
      }
    }

    const insertDuration = Date.now() - insertStartTime;
    const stepDuration = Date.now() - stepStartTime;
    logger.info(`sync_transaction: [STEP2] Employees check complete -> pairs=${pairs.length}, newly_inserted=${totalInserted}, insert_duration=${insertDuration}ms, total_duration=${stepDuration}ms`);

    return { pairsCount: pairs.length, insertedCount: totalInserted };
  } catch (error) {
    const stepDuration = Date.now() - stepStartTime;
    const rowsCountOnError = Array.isArray(rows) ? rows.length : 0;
    logger.error(`sync_transaction: [STEP2] Error ensuring employees exist after ${stepDuration}ms, rowsCount=${rowsCountOnError}`, error);
    throw error;
  }
}

module.exports = ensureEmployeesExist;
