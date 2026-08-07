const activityFormatter = require('../data_formatters/activity_formatter');
const activityService = require('../services/activityService');
const undoService = require('../undo/undoService');

const activityController = {

  async undoBatch(batchId, user) {
    return await undoService.undoBatch(batchId, user);
  },

  async getAllActivities(limit, offset, companyId) {
    const activities = await activityService.getAllActivities(limit, offset, companyId);
    return activityFormatter.formatActivityResponse(activities);
  },


  async getActivitiesByHead(head, limit, offset, companyId) {
    const activities = await activityService.getActivitiesByHead(head, limit, offset, companyId);
    return activityFormatter.formatActivityResponse(activities);
  },

  async getActivitiesByHeadAndObjectId(head, objectId, limit, offset, companyId) {
    const activities = await activityService.getActivitiesByHeadAndObjectId(head, objectId, limit, offset, companyId);
    return activityFormatter.formatActivityResponse(activities);
  },


  async createActivity(head, log, timestamp, objectName, objectId, createdBy, companyId, type = null, isConfirmed = null) {
    void timestamp;
    void isConfirmed;
    return await activityService.createActivity({ head, log, objectName, objectId, createdBy, companyId, type });
  }
};

module.exports = activityController;

