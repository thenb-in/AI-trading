import { ApiService } from '@services/ApiService';
import { dateFiltersToday } from '@startup/filter/filterConfig';

// Notification Log's filter panel. Each filter is complete on its own: a
// dynamic one carries its `fetchData` beside its name and label.

const ALL_USERS = { value: 'all', label: 'All Users' };

const NotificationLogReportFilters = [
  ...dateFiltersToday,
  {
    name: 'user_id', label: 'User', type: 'select', default: 'all', is_standard: true, order: 3,
    options: [ALL_USERS],
    // ApiService caches the roster; `force` arrives when the user presses
    // refresh in the filter panel.
    fetchData: ({ force }) =>
      ApiService.getAllUsers({ force }).then((resp) => [
        ALL_USERS,
        ...resp.data.users.map((user) => ({
          value: String(user.id),
          label: user.name || user.username || String(user.id),
        })),
      ]),
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

export { NotificationLogReportFilters };
