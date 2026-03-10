/**
 * Data formatter for Activity responses
 */
const activityColumns = require('../../constants/columns/startup/activityColumns');


function formatActivityResponse(activities) {
  const rows = activities.map(activity => {
    const activityData = activity.toJSON ? activity.toJSON() : activity;
    return {
      id: activityData.id,
      head: activityData.head,
      log: activityData.log,
      objectName: activityData.objectName || null,
      createdByName: activityData.createdByUser?.name || null,
      createdAt: activityData.createdAt || null,
      updatedAt: activityData.updatedAt || null
    };
  });

  return {
    columns: activityColumns,
    data: rows
  };
}

module.exports = {
  formatActivityResponse
};

