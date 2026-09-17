const geographyColumns = [
  { key: 'name', display_name: 'Place', type: 'string' },
  { key: 'level', display_name: 'Level', type: 'string' },
  { key: 'code', display_name: 'Code', type: 'string' },
  { key: 'path', display_name: 'Sits Under', type: 'string' },
  { key: 'childCount', display_name: 'Places Within', type: 'number' },
  { key: 'is_active', display_name: 'In Use', type: 'boolean' }
];

module.exports = geographyColumns;
