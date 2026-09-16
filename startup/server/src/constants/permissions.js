// Framework permission surface, plus the rule for composing it with an app's
// permissions.
//
// startup never imports the app layer — the dependency only ever runs
// app -> startup. So this file cannot reach out and collect the app's
// permissions itself. Instead it exports `buildPermissionSets`: startup owns
// the *rule* for how permission sets compose, and the app layer owns the
// *data* and calls the rule (see app/server/src/constants/permissions.js).
//
// Imported without composition, this module is the bare framework surface
// (user, company, role, permission, role_permission, notifications), which is
// what startup's own routes and services consume.

const basePermissions = require('./base_permissions');
const baseRoles = require('./base_roles');

const SYSTEM_ROLE_CONSTANTS = baseRoles.SYSTEM_ROLE_CONSTANTS;

/**
 * Compose the framework permission sets with an app layer's contributions.
 *
 * @param {object} [appPermissions]
 * @param {object} [appPermissions.masters] app master permissions (nested CRUD)
 * @param {object} [appPermissions.modules] app module permissions (flat)
 * @param {object} [appPermissions.reports] app report permissions (flat)
 * @returns {object} the composed MODULE / MASTER / REPORT sets and roles
 */
const buildPermissionSets = ({ masters = {}, modules = {}, reports = {} } = {}) => ({
  MODULE_PERMISSION_CONSTANTS: {
    ...basePermissions.MODULE_PERMISSION_CONSTANTS,
    ...modules
  },
  MASTER_PERMISSION_CONSTANTS: {
    ...basePermissions.MASTER_PERMISSION_CONSTANTS,
    ...masters
  },
  REPORT_PERMISSION_CONSTANTS: {
    ...basePermissions.REPORT_PERMISSION_CONSTANTS,
    ...reports
  },
  SYSTEM_ROLE_CONSTANTS
});

module.exports = {
  ...buildPermissionSets(),  // raw framework surface (no app contributions)
  buildPermissionSets
};
