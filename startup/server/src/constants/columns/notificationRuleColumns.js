const notificationRuleColumns = [
  { key: 'name', display_name: 'Rule Name', type: 'string', hidden: false },
  { key: 'is_active', display_name: 'Active', type: 'boolean', hidden: false },
  { key: 'recipientsLabel', display_name: 'Recipients', type: 'string', hidden: false },
  { key: 'channelsLabel', display_name: 'Channels', type: 'string', hidden: false },
  { key: 'createdByName', display_name: 'Created By', type: 'string', hidden: false },
  { key: 'createdAt', display_name: 'Created At', type: 'datetime', hidden: false }
];

module.exports = notificationRuleColumns;
