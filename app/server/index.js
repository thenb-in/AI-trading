// App-side server boot. Wires the framework's buildApp() with this app's
// own routes, then calls startServer().
//
// Add app-specific routes/middleware here. The framework (auth, users,
// admin, layouts, etc.) is composed by buildApp() under /api/v1/*.

const { buildApp } = require('../../startup/server/buildApp');
const { registerAllJobs } = require('./scheduler');

const { startServer } = buildApp({
  extraRoutes: [
    // Example:
    // { prefix: '/api/v1/payroll', router: require('./src/routes/payrollRoutes') }
  ],
  mountAppRoutes: (_app, _prefix) => {
    // Register app-only routes here, e.g.
    // _app.get(`${_prefix}/ping`, (req, res) => res.send('pong'));
  },
  // Framework starts/stops the registry around server.listen + SIGTERM.
  registerSchedulerJobs: registerAllJobs
});

startServer();
