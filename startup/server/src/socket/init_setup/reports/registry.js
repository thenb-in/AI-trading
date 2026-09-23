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
//   - The whole route stack runs, so per-route middleware such as
//     requirePermission gates the socket path exactly as it gates REST — except
//     for `protect`, which is dropped (see below).

const { invokeExpressHandler } = require('./expressShim');
const { protect } = require('../../../middleware/authMiddleware');
const genericReportRoutes = require('../../../routes/reportRoutes');


/**
 * `protect` reads an access token off the request's headers or cookies. A socket
 * run has neither: the connection was authenticated at the handshake and the
 * runner hands the registry the user it belongs to, so there is no token left to
 * present and nothing to present it on. Running it here asks an already-known
 * caller to prove itself with something that was never part of this transport,
 * and it answers "No token found" for every report on a route that carries it.
 *
 * So identification is dropped and authorization is kept: requirePermission and
 * every other per-route guard still run, against the user the socket
 * authenticated, and the shim attaches the same data scope `protect` would have.
 */
const isAuthentication = (handle) => handle === protect;

// Runs a route's handlers in order, each one's next() starting the following one,
// the way Express walks a route stack.
const chainHandlers = (handles) => (req, res, done) => {
  const step = (index, err) => (err || index === handles.length ? done(err) : handles[index](req, res, (next) => step(index + 1, next)));
  return step(0);
};

function buildRegistryFromRouter(router, prefix = '') {
  const registry = {};
  for (const layer of router.stack || []) {
    if (!layer.route || !layer.route.methods?.get) {
      continue;
    }
    const slug = prefix + String(layer.route.path).replace(/^\//, '');
    const handles = (layer.route.stack || [])
      .map((routeLayer) => routeLayer.handle)
      .filter((handle) => !isAuthentication(handle));
    const notFunction = handles.find((handle) => typeof handle !== 'function');
    if (notFunction !== undefined || handles.length === 0) {
      throw new Error(`registry: route "${slug}" has a non-function handler (type=${typeof notFunction})`);
    }
    registry[slug] = chainHandlers(handles);
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
