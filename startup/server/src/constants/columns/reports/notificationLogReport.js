const textColumn = (key, display_name, { width = 'w-32', cls = 'text-left' } = {}) =>
  ({ key, display_name, type: 'string', width, class: cls, export: true });

function get_notification_log_report_columns() {
  return [
    textColumn('user_name', 'User', { width: 'w-44' }),
    { key: 'sent_at', display_name: 'When', type: 'datetime', width: 'w-44', class: 'text-left', export: true },
    textColumn('channel_label', 'Channel', { width: 'w-28', cls: 'text-center' }),
    textColumn('status_label', 'Status', { width: 'w-28', cls: 'text-center' }),
    textColumn('rule_name', 'Rule', { width: 'w-56' }),
    textColumn('title', 'Title', { width: 'w-56' }),
    textColumn('log', 'What Happened', { width: 'w-96' }),
    textColumn('message', 'Message', { width: 'w-96' })
  ];
}

module.exports = { get_notification_log_report_columns };
