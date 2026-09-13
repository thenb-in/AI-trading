const activityColumns = [
  { key: 'id', display_name: 'ID', type: 'number' },
  { key: 'head', display_name: 'Head', type: 'string' },
  { key: 'type', display_name: 'Type', type: 'string' },
  { key: 'objectName', display_name: 'Message', type: 'string' },
  { key: 'objectId', display_name: 'Record ID', type: 'string' },
  { key: 'createdByName', display_name: 'Audit By', type: 'string' },
  { key: 'createdAt', display_name: 'Audit At', type: 'datetime' }
];

module.exports = activityColumns;
