const announcementColumns = [
  { key: 'title', display_name: 'Title', type: 'string' },
  { key: 'body', display_name: 'Message', type: 'string' },
  { key: 'severity', display_name: 'Severity', type: 'string' },
  { key: 'audienceLabel', display_name: 'Who Sees It', type: 'string' },
  { key: 'starts_at', display_name: 'Shown From', type: 'datetime' },
  { key: 'ends_at', display_name: 'Shown Until', type: 'datetime' },
  { key: 'is_active', display_name: 'Running', type: 'boolean' },
  { key: 'createdAt', display_name: 'Created At', type: 'datetime' }
];

module.exports = announcementColumns;
