// Product-specific permissions for this app.
//
// Generic, framework-level permissions shared by every product built on startup
// (user, company, role, permission, role_permission, notifications) live in
// `@startup/src/constants/base_permissions`. The app's own permissions — one per
// master, module and report it adds — go here.
//
// These sets are composed with the framework sets in `./permissions`, which is
// the surface every app consumer imports. Nothing should import this file
// directly except that composition point — import `../constants/permissions`
// instead.
//
// The three helpers below build the conventional shape for each kind:
//
//   create_master_permission('widget_master')  -> read_/create_/update_/delete_
//   create_module_permission('widget', 'Widget')
//   create_report_permission('widget-report')  -> read_widget-report
//
// Empty in the reference scaffold — apps declare their own.





//uncomment to use this
// const basePermissions = require('@startup/src/constants/base_permissions');


// const {
//   create_master_permission,
//   create_module_permission,
//   create_report_permission
// } = basePermissions;

const APP_MASTER_PERMISSION_CONSTANTS = {};

const APP_MODULE_PERMISSION_CONSTANTS = {};

const APP_REPORT_PERMISSION_CONSTANTS = {};

module.exports = {
  APP_MASTER_PERMISSION_CONSTANTS,
  APP_MODULE_PERMISSION_CONSTANTS,
  APP_REPORT_PERMISSION_CONSTANTS
};
