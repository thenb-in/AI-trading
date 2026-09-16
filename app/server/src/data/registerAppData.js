// App-side registration into startup registries
const { registerActivityTypes } = require('@startup/src/constants/activity');
const { registerPermissionSets } = require('@startup/src/constants/permissionCatalog');
const permissionSets = require('@appServer/src/constants/permissions');
const { AUDIT_ACTIVITY_TYPES } = require('@appServer/src/constants/auditActivity');
const reportRegistry = require('@startup/src/socket/init_setup/reports/registry');

const reportRoutes = require('@appServer/src/routes/reportRoutes');

// --- App-owned audit activity types ---
registerActivityTypes(AUDIT_ACTIVITY_TYPES);

// --- App permissions, so the catalog can say what each one is ---
registerPermissionSets(permissionSets);

// --- App report routers (socket report runner) ---
// Extra routers mount under a prefix, e.g.
//   reportRegistry.registerReportRouter(dashboardRoutes, 'dashboard/');
reportRegistry.registerReportRouter(reportRoutes);
