// Re-export the startup implementation; app code only differs from startup in import paths,
// so we proxy to keep one source of truth.
module.exports = require('@startup/src/constants/auth');
