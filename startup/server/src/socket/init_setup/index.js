// init_setup — boot-time side effects for the socket stack.
//
// Loading this module:
//   1. loads reports/registry.js — validates the app's registeredReports
//      at module load via the @appServer alias;
//   2. loads reports/runReportHandler.js — queues the 'report:run' socket
//      handler so initClientAppServerSocket() picks it up at boot.
//
// Nothing is exported. Requiring the file is the entire API.

require('./reports/runReportHandler');
require('./reports/registry');
