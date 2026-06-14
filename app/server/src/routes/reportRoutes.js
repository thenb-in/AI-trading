const express = require('express');

const router = express.Router();

// App report routes. The framework's socket report runner
// (startup/server/src/socket/init_setup/reports/registry.js) walks this
// router's stack at load time and indexes every GET route by its slug, so
// adding `router.get('/x-report', requirePermission(...), handler)` here makes
// the report available to the report-runner process automatically.
//
// Empty in the reference scaffold — apps register their own report routes.

module.exports = router;
