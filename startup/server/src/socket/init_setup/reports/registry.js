// Report registry (app-populated).
//
// The app registers its report routers here via registerReportRouter() from its
// registerAppData bootstrap — startup must not import @appServer. Each call walks
// the Express router stack and indexes every GET route by its slug → final route
// handler, so adding a new `router.get('/x-report', ...)` in reportRoutes.js
// automatically makes it available to the socket runner — no parallel list to
// keep in sync.
//
// Caveats:
//   - GET-only. POST/PUT routes are not exposed via the socket transport.
//   - Per-route middleware (e.g. requirePermission) is NOT executed on the
//     socket path. Authorization is governed by the socket auth middleware
//     and trust of the originating app server. Don't expose a report via
//     this transport if you rely on Express middleware for authz.

const { invokeExpressHandler } = require('./expressShim');
const genericReportRoutes = require('../../../routes/reportRoutes');


function buildRegistryFromRouter(router, prefix = '') {
  const registry = {};
  for (const layer of router.stack || []) {
    if (!layer.route || !layer.route.methods?.get) {
      continue;
    }
    const slug = prefix + String(layer.route.path).replace(/^\//, '');
    const stack = layer.route.stack || [];
    const last = stack[stack.length - 1];
    const handler = last?.handle;
    if (typeof handler !== 'function') {
      throw new Error(`registry: route "${slug}" resolved a non-function handler (type=${typeof handler})`);
    }
    registry[slug] = handler;
  }
  return registry;
}

const registeredReports = {};

/**
 * Register every GET route on an Express router as a runnable report handler.
 * Called by the app (registerAppData) at process start, before the socket
 * report runner handles any request.
 */
function registerReportRouter(router, prefix = '') {
  Object.assign(registeredReports, buildRegistryFromRouter(router, prefix));
}

// Reports the framework ships itself, merged in the same way the app's are — the
// server-side twin of reportModuleRegistry merging genericReportModules on the client.
// An app router registered later under the same slug replaces one of these.
registerReportRouter(genericReportRoutes);

function has(reportKey) {
  return Object.prototype.hasOwnProperty.call(registeredReports, reportKey);
}

function get(reportKey) {
  return registeredReports[reportKey] ?? null;
}

function list() {
  return Object.keys(registeredReports);
}

async function run(reportKey, { filters, user }) {
  const handler = get(reportKey);
  if (!handler) {
    throw new Error(`UNKNOWN_REPORT_KEY: ${reportKey} (known=${list().join(',')})`);
  }
  return invokeExpressHandler(handler, { user, filters });
}

module.exports = { has, get, list, run, registerReportRouter };
