// The logger implementation lives in the foundational `nucleus` package so
// startup and app/server share one copy. This file re-exports it at the
// `@startup/logger` path the codebase imports.
module.exports = require('../../nucleus/logger');
