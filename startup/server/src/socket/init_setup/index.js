// init_setup — boot-time side effects for the socket stack.
//
// Loading this module loads reports/runReportHandler.js, which queues the
// 'report:run' socket handler so initClientAppServerSocket() picks it up at
// boot. The report registry it dispatches to is populated by the app via
// registerReportRouter() (see @appServer/src/data/registerAppData), required from
// the app entrypoint before this runs — startup never imports @app.
//
// Nothing is exported. Requiring the file is the entire API.

require('./reports/runReportHandler');
