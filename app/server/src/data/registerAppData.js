// App-side registrations handed to the framework at process start.
//
// The framework must never import @appServer, so anything app-specific it
// needs is pushed in from here instead. This module has to be required before
// the framework defines its models (i.e. before @startup/buildApp is loaded),
// otherwise the extra columns miss the sequelize.define() call entirely.

const reportRoutes = require('@appServer/src/routes/reportRoutes');

// --- App-owned audit activity types ---
registerActivityTypes(AUDIT_ACTIVITY_TYPES);

// --- App permissions, so the catalog can say what each one is ---
registerPermissionSets(permissionSets);

// ERP's reports, exposed to the socket report runner. Mounting reportRoutes on
// Express (app_routes.js) only serves the HTTP path; the runner resolves a
// report by slug through this registry, so without it every ERP report runs
// framework-only and 404s on the socket transport.
// Required last: it pulls in models, which must not happen until the column
// registrations above have been made.
const reportRegistry = require('@startup/src/socket/init_setup/reports/registry');
const reportRoutes = require('../routes/reportRoutes');

reportRegistry.registerReportRouter(reportRoutes);
