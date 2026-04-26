const { buildApp } = require('./buildApp');
const appRoutes = require('./src/routes/app_routes');
const companyProfileRoutes = require('./src/routes/companyProfileRoutes');

/**
 * Backwards-compatible standalone boot for the framework.
 *
 * The runnable boot path is `app/server/index.js`, which uses `buildApp`
 * directly with its own routes. This file remains so existing tooling
 * (CI smoke test, `npm run dev` from startup/server) keeps working during
 * the transition.
 */
const { startServer } = buildApp({
  extraRoutes: [
    { prefix: '/api/v1/company-profile', router: companyProfileRoutes }
  ],
  mountAppRoutes: appRoutes
});

startServer();
