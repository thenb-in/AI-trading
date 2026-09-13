// Re-export shim: implementation moved to the foundational `nucleus` package so it
// can be shared by startup and app/server.
// This thin shim keeps the original @startup path working unchanged.
module.exports = require('../../../../nucleus/constants/http');
