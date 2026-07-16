const sequelizeErrors = {
  SEQUELIZE_VALIDATION_ERROR: 'SequelizeValidationError',
  SEQUELIZE_UNIQUE_CONSTRAINT_ERROR: 'SequelizeUniqueConstraintError',
  SEQUELIZE_FOREIGN_KEY_CONSTRAINT_ERROR: 'SequelizeForeignKeyConstraintError',
  SEQUELIZE_DATABASE_ERROR: 'SequelizeDatabaseError',
  SEQUELIZE_TIMEOUT_ERROR: 'SequelizeTimeoutError',
  SEQUELIZE_CONNECTION_ERROR: 'SequelizeConnectionError',
  SEQUELIZE_CONNECTION_REFUSED_ERROR: 'SequelizeConnectionRefusedError',
  SEQUELIZE_CONNECTION_TIMED_OUT_ERROR: 'SequelizeConnectionTimedOutError'
};

const COMPANY_ID_REQUIRED = 'Company ID is required';

const ONLY_SUPERADMINS_CAN_CREATE_GLOBAL_ROLES = 'Only superadmins can create global roles';
const ONLY_SUPERADMINS_CAN_CREATE_GLOBAL_SUBSCRIPTIONS = 'Only superadmins can create global subscriptions';
const ONLY_SUPERADMINS_CAN_IMPORT_GLOBAL_SUBSCRIPTIONS = 'Only superadmins can import global subscriptions';
const ONLY_SUPERADMINS_CAN_MODIFY_GLOBAL_SUBSCRIPTIONS = 'Only superadmins can modify global subscriptions';


module.exports = {
  sequelizeErrors,
  COMPANY_ID_REQUIRED,
  ONLY_SUPERADMINS_CAN_CREATE_GLOBAL_ROLES,
  ONLY_SUPERADMINS_CAN_CREATE_GLOBAL_SUBSCRIPTIONS,
  ONLY_SUPERADMINS_CAN_IMPORT_GLOBAL_SUBSCRIPTIONS,
  ONLY_SUPERADMINS_CAN_MODIFY_GLOBAL_SUBSCRIPTIONS
};
