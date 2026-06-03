// The logger implementation now lives in the foundational `nucleus` package so
// it can be shared by startup, app/server AND the standalone biometric gateways
// without any of them duplicating it. This file is a thin re-export shim kept
// at the original path so the dozens of existing `@startup/logger` /
// `require('../../logger')` imports across the codebase keep working unchanged.
//
// New code in the nucleus-based layers (e.g. biometric_gateway/common) should
// require '@nucleus/logger' directly.
module.exports = require('../../nucleus/logger');
