const basePermissions = require('./startup/base_permissions');
const baseRoles = require('./startup/base_roles');



const SYSTEM_ROLE_CONSTANTS = baseRoles.SYSTEM_ROLE_CONSTANTS;

const MASTER_PERMISSION_CONSTANTS = {
  ...basePermissions.MASTER_PERMISSION_CONSTANTS,
  ACTIVITY: basePermissions.create_master_permission('activity')
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
