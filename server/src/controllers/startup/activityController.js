const activityFormatter = require('../../dataFormatters/startup/activityFormatter');
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


  async createActivity(head, log, timestamp, objectName, objectId, createdBy, companyId) {
    return await activityService.createActivity(head, log, timestamp, objectName, objectId, createdBy, companyId);
  }
};

module.exports = activityController;

