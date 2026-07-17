// init_setup — boot-time side effects for the socket stack.
//
// Loading this module loads reports/runReportHandler.js, which queues the
// 'report:run' socket handler so initClientAppServerSocket() picks it up at
// boot.
//
// The report registry is NOT loaded here anymore: it is initialised by
// injection from whichever process composes the app (buildApp({ reportRoutes })
// for the app server, the runner bootstrap for report_runner) so the framework
// never requires into app/. See reports/registry.js.
//
// Nothing is exported. Requiring the file is the entire API.

require('./reports/runReportHandler');
