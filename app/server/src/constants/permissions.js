// The app's permission surface: the startup framework set composed with
// etime's HR/payroll set.
//
// This is what app code imports (`../constants/permissions`). The framework
// permissions and the composition rule come from startup; the HR-specific
// permissions come from `./app_permissions`. startup never imports this file —
// the dependency only runs app -> startup.

const { buildPermissionSets } = require('@startup/src/constants/permissions');
const {
  APP_MASTER_PERMISSION_CONSTANTS,
  APP_MODULE_PERMISSION_CONSTANTS,
  APP_REPORT_PERMISSION_CONSTANTS
} = require('./app_permissions');

module.exports = buildPermissionSets({
  masters: APP_MASTER_PERMISSION_CONSTANTS,
  modules: APP_MODULE_PERMISSION_CONSTANTS,
  reports: APP_REPORT_PERMISSION_CONSTANTS
});
