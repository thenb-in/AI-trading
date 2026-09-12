// Display names for the reports the framework itself ships — the counterpart to
// the app's own reports_names.js. The name is read back in the messages a report
// returns and in its error logs, so it lives here rather than inline in a view:
// one place to read it from, and one place to change it.
//
// Framework-owned names only. A report the app adds names itself, in the app's file.

const NOTIFICATION_LOG_REPORT = 'Notification Log Report';

module.exports = {
  NOTIFICATION_LOG_REPORT
};
