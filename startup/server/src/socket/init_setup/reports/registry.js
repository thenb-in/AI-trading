// Auto-derived report registry.
//
// Walks the Express router stack at module load and indexes every GET route
// by its slug → final route handler. Adding a new `router.get('/x-report', ...)`
// in reportRoutes.js automatically makes it available to the socket runner —
// no parallel registration list to keep in sync.
//
// Caveats:
//   - GET-only. POST/PUT routes are not exposed via the socket transport.
//   - Per-route middleware (e.g. requirePermission) is NOT executed on the
//     socket path. Authorization is governed by the socket auth middleware
//     and trust of the originating app server. Don't expose a report via
//     this transport if you rely on Express middleware for authz.

const { invokeExpressHandler } = require('./expressShim');
const reportRoutes = require('@appServer/src/routes/reportRoutes');

function buildRegistryFromRouter(router) {
  const registry = {};
  for (const layer of router.stack || []) {
    if (!layer.route || !layer.route.methods?.get) {
      continue;
    }
    const slug = String(layer.route.path).replace(/^\//, '');
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

const registeredReports = buildRegistryFromRouter(reportRoutes);

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

module.exports = { has, get, list, run };
