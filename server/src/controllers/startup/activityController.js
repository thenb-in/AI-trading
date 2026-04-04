const activityFormatter = require('../../data_formatters/startup/activity_formatter');
const activityService = require('../../services/startup/activityService');

const activityController = {

  async getAllActivities(limit, companyId) {
    const activities = await activityService.getAllActivities(limit, companyId);
    return activityFormatter.formatActivityResponse(activities);
  },


  async getActivitiesByHead(head, limit, companyId) {
    const activities = await activityService.getActivitiesByHead(head, limit, companyId);
    return activityFormatter.formatActivityResponse(activities);
  },


  async createActivity(head, log, timestamp, objectName, objectId, createdBy, companyId, type = null, isConfirmed = null) {
    return await activityService.createActivity(head, log, timestamp, objectName, objectId, createdBy, companyId, type, isConfirmed);
  }
};

module.exports = activityController;

