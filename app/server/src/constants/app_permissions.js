// App-specific permissions for the reference scaffold.
//
// Product-specific permissions (whatever masters, modules and reports the app
// adds on top of the framework) belong here in the app layer. Generic,
// framework-level permissions shared by every product built on startup (user,
// company, role, permission, role_permission, notifications) live in
// `@startup/src/constants/base_permissions`.
//
// These sets are composed with the framework sets in `./permissions`, which is
// the surface every app consumer imports. Nothing should import this file
// directly except that composition point — import `../constants/permissions`
// instead.
//
// Empty in the reference scaffold: the app adds no permissions of its own yet.
// To add some, build them with the helpers off `base_permissions`, e.g.
//
//   const { create_master_permission, create_report_permission } =
//     require('@startup/src/constants/base_permissions');
//
//   const APP_MASTER_PERMISSION_CONSTANTS = {
//     WIDGET: create_master_permission('widget'),          // create/read/update/delete
//   };
//   const APP_REPORT_PERMISSION_CONSTANTS = {
//     WIDGET_REPORT: create_report_permission('widget_report'),
//   };

const APP_MASTER_PERMISSION_CONSTANTS = {};
const APP_MODULE_PERMISSION_CONSTANTS = {};
const APP_REPORT_PERMISSION_CONSTANTS = {};

module.exports = {
  APP_MASTER_PERMISSION_CONSTANTS,
  APP_MODULE_PERMISSION_CONSTANTS,
  APP_REPORT_PERMISSION_CONSTANTS
};
