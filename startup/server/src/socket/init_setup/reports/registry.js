// Report registry — an app-injected map of report slug → route handler.
//
// The app owns its report routes; the framework must not reach into `app/`
// to read them (that would invert the app -> startup dependency). So instead
// of requiring the routes here, the registry is INITIALISED by whichever
// top-level process composes the app:
//   - the app server, via buildApp({ reportRoutes }) (see buildApp.js);
//   - the report_runner process, via registry.init(reportRoutes) at boot.
//
// init() walks the Express router stack and indexes every GET route by its
// slug → final route handler. Adding a new `router.get('/x-report', ...)` in
// the app's reportRoutes.js makes it available automatically — no parallel
// registration list to keep in sync.
//
// Caveats:
//   - GET-only. POST/PUT routes are not exposed via the socket transport.
//   - Per-route middleware (e.g. requirePermission) is NOT executed on the
//     socket path. Authorization is governed by the socket auth middleware
//     and trust of the originating app server. Don't expose a report via
//     this transport if you rely on Express middleware for authz.

const { invokeExpressHandler } = require('./expressShim');

// Populated by init(). null until then so callers get a clear error instead
// of silently resolving every report key to "unknown".
let registeredReports = null;

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

/**
 * Initialise the registry from the app's report router. Called once per
 * process by whichever entrypoint composes the app (buildApp for the app
 * server, the runner bootstrap for report_runner).
 * @param {import('express').Router} reportRoutes
 */
function init(reportRoutes) {
  if (!reportRoutes || !Array.isArray(reportRoutes.stack)) {
    throw new Error(`registry.init: expected an Express router (with a .stack) as reportRoutes, got ${typeof reportRoutes} (stack=${reportRoutes && typeof reportRoutes.stack})`);
  }
  registeredReports = buildRegistryFromRouter(reportRoutes);
  return registeredReports;
}

function ensureInitialised() {
  if (registeredReports === null) {
    throw new Error(`registry: not initialised (registeredReports=${registeredReports}) — call registry.init(reportRoutes) before use, via buildApp({ reportRoutes }) or the runner bootstrap`);
  }
}

function has(reportKey) {
  ensureInitialised();
  return Object.prototype.hasOwnProperty.call(registeredReports, reportKey);
}

function get(reportKey) {
  ensureInitialised();
  return registeredReports[reportKey] ?? null;
}

function list() {
  ensureInitialised();
  return Object.keys(registeredReports);
}

async function run(reportKey, { filters, user }) {
  const handler = get(reportKey);
  if (!handler) {
    throw new Error(`UNKNOWN_REPORT_KEY: ${reportKey} (known=${list().join(',')})`);
  }
  return invokeExpressHandler(handler, { user, filters });
}

module.exports = { init, has, get, list, run };
