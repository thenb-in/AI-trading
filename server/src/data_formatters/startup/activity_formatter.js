const activityColumns = require('../../constants/columns/startup/activityColumns');
const { formatResponse } = require('../formatResponse');

function mapActivityRow(data) {
  return {
    id: data.id,
    head: data.head,
    log: data.log,
    objectName: data.objectName || null,
    createdByName: data.createdByUser?.name || null,
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null
  };
}

function formatActivityResponse(activities) {
  return formatResponse(activities, activityColumns, mapActivityRow);
}

module.exports = {
  formatActivityResponse
};
