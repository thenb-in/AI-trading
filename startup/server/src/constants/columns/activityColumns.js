const activityColumns = [
  {
    key: 'id',
    display_name: 'ID',
    type: 'number',
    hidden: false
  },
  {
    key: 'head',
    display_name: 'Head',
    type: 'string',
    hidden: false
  },
  {
    key: 'type',
    display_name: 'Type',
    type: 'string',
    hidden: false
  },
  {
    key: 'objectName',
    display_name: 'Message',
    type: 'string',
    hidden: false
  },
  {
    key: 'objectId',
    display_name: 'Record ID',
    type: 'string',
    hidden: false
  },
  {
    key: 'createdByName',
    display_name: 'Audit By',
    type: 'string',
    hidden: false
  },
  {
    key: 'createdAt',
    display_name: 'Audit At',
    type: 'datetime',
    hidden: false
  }
];

module.exports = activityColumns;

