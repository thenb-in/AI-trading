// Re-export shim: implementation moved to the foundational `nucleus` package so it
// can be shared by startup, app/server AND the standalone biometric gateways.
// This thin shim keeps the original @startup path working unchanged.
module.exports = require('../../../../nucleus/constants/file_uploads');
