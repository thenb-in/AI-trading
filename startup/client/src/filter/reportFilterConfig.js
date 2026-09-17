import { dateFiltersToday } from './filterConfig';

// Filter panels for the framework's own reports. Same arrangement as the app's
// src/filter/reportFilterConfig.js — one exported array per report, which the
// report component reads.

const NotificationLogReportFilters = [
  ...dateFiltersToday,
  {
    name: 'user_id', label: 'User', type: 'select', dynamic: true, options: [],
    default: 'all', is_standard: true, order: 3
  },
  {
    name: 'status', label: 'Status', type: 'select', default: 'all', is_standard: true, order: 4,
    options: [
      { value: 'all', label: 'All' },
      { value: 'sent', label: 'Sent' },
      { value: 'failed', label: 'Failed' },
      { value: 'skipped', label: 'Skipped' }
    ]
  },
  {
    name: 'channel', label: 'Channel', type: 'select', default: 'all', is_standard: true, order: 5,
    // Values match RULE_CHANNEL on the server; labels match RULE_CHANNEL_LABEL.
    options: [
      { value: 'all', label: 'All' },
      { value: 'in_app', label: 'In-App' },
      { value: 'email', label: 'Mail' },
      { value: 'whatsapp', label: 'WhatsApp' }
    ]
  }
];

export {
  NotificationLogReportFilters,
};
