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
const ACTIVITY_MISSING_REQUIRED_FIELDS = 'Missing required fields: head, log, and timestamp are required';


module.exports = {
  sequelizeErrors,
  COMPANY_ID_REQUIRED,
  ACTIVITY_MISSING_REQUIRED_FIELDS
};
