const notificationRuleColumns = [
  { key: 'name', display_name: 'Rule Name', type: 'string' },
  { key: 'is_active', display_name: 'Active', type: 'boolean' },
  { key: 'recipientsLabel', display_name: 'Recipients', type: 'string' },
  { key: 'channelsLabel', display_name: 'Channels', type: 'string' },
  { key: 'createdByName', display_name: 'Created By', type: 'string' },
  { key: 'createdAt', display_name: 'Created At', type: 'datetime' }
];

module.exports = notificationRuleColumns;
