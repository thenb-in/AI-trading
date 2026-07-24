// App-side registration into startup registries
const { registerActivityTypes } = require('@startup/src/constants/activity');
const { AUDIT_ACTIVITY_TYPES } = require('@appServer/src/constants/auditActivity');
const reportRegistry = require('@startup/src/socket/init_setup/reports/registry');

const reportRoutes = require('@appServer/src/routes/reportRoutes');


// --- App-owned audit activity types ---
registerActivityTypes(AUDIT_ACTIVITY_TYPES);

// --- App report routers (socket report runner) ---
reportRegistry.registerReportRouter(reportRoutes);

