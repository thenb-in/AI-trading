const basePermissions = require('./startup/base_permissions');
const baseRoles = require('./startup/base_roles');



const SYSTEM_ROLE_CONSTANTS = baseRoles.SYSTEM_ROLE_CONSTANTS;

const MASTER_PERMISSION_CONSTANTS = {
  ...basePermissions.MASTER_PERMISSION_CONSTANTS,
  TEST_MASTER_1: basePermissions.create_master_permission('test_master_1'),
  TEST_MASTER_2: basePermissions.create_master_permission('test_master_2')
};

const MODULE_PERMISSION_CONSTANTS = {
  ...basePermissions.MODULE_PERMISSION_CONSTANTS
};

const REPORT_PERMISSION_CONSTANTS = {
  ...basePermissions.REPORT_PERMISSION_CONSTANTS
};


module.exports = {
  MODULE_PERMISSION_CONSTANTS,
  SYSTEM_ROLE_CONSTANTS,
  MASTER_PERMISSION_CONSTANTS,
  REPORT_PERMISSION_CONSTANTS
};
