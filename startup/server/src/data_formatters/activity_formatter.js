const { decodeActivityType } = require('../activitylogs/activityLogUtils');
const activityColumns = require('../constants/columns/activityColumns');
const { formatResponse } = require('./formatResponse');


function mapActivityRow(data) {
  return {
    id: data.id,
    head: data.head,
    log: data.log,
    type: decodeActivityType(data.type) || null,
    objectName: data.objectName || null,
    objectId: data.objectId ?? null,
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
