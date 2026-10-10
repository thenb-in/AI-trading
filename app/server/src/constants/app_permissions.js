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





const basePermissions = require('@startup/src/constants/base_permissions');

const {
  create_master_permission,
  create_module_permission,
  // create_report_permission
} = basePermissions;

// Master-style permissions (read/create/update/delete):
// - COMPANY_TRADING_CONFIG gates the Company Profile trading tab independently
//   of generic company settings.
// - AUTO_EXECUTION gates the live auto-execution endpoints (autotrade mode,
//   catch-up entry, GTT); the Live Trading / Trade Desk pages reuse its
//   read_auto_execution permission for nav visibility.
const APP_MASTER_PERMISSION_CONSTANTS = {
  COMPANY_TRADING_CONFIG: create_master_permission('company_trading_config'),
  AUTO_EXECUTION: create_master_permission('auto_execution'),
};

// Module-style permissions (view_<x>_module) — one per page/dashboard.
const APP_MODULE_PERMISSION_CONSTANTS = {
  MARKET_DASHBOARD: create_module_permission('market', 'Market Dashboard'),
  SYSTEM_LOGIC: create_module_permission('system_logic', 'System Logic'),
  METHOD2: create_module_permission('method2', 'Method 2'),
  SCALP_DASHBOARD: create_module_permission('scalp_dashboard', 'Scalp Dashboard'),
  OPTION_CHAIN: create_module_permission('option_chain', 'Option Chain'),
  YT_BACKTEST: create_module_permission('yt_backtest', 'YT Backtest'),
  SEASONALITY: create_module_permission('seasonality', 'Seasonality'),
};

const APP_REPORT_PERMISSION_CONSTANTS = {};

module.exports = {
  APP_MASTER_PERMISSION_CONSTANTS,
  APP_MODULE_PERMISSION_CONSTANTS,
  APP_REPORT_PERMISSION_CONSTANTS
};
