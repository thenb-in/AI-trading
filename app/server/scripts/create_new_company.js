'use strict';
// App entrypoint for `npm run create-new-company`.
//
// The framework seeder (startup/server/create_company_with_role_and_perms.js)
// only knows the framework's own permission set. An app built on startup has to
// inject its composed set — framework permissions PLUS the app's trading
// permissions (app_permissions.js, composed in src/constants/permissions.js) —
// or the seeded sadmin logs in with framework permissions only and sees none of
// the trading modules.
//
// Requiring the framework module first runs its top-level module-alias
// registration, so `@startup/...` resolves when permissions.js is required next.
const { runToExit } = require('../../../startup/server/create_company_with_role_and_perms.js');
const permissionSets = require('../src/constants/permissions');

// No app-specific starting data to seed: the company trading config lives on the
// CompanyProfile and is created with the company via its model defaults, so the
// default no-op createStartingAppData hook is left in place.
runToExit({ permissionSets });
