// services/startup/activityService.js
const { Op: _Op } = require('sequelize');
// Activity is the primary model for this service
const { pushActivityToExternalServer } = require('../../../interfaces/startup/activityInterface');
const logger = require('../../../logger');
const { Activity, User } = require('../../models');

const ACTIVITY_ATTRIBUTES = ['id', 'head', 'log', 'timestamp', 'objectName', 'objectId', 'createdBy', 'companyId', 'isConfirmed', 'type', 'createdAt', 'updatedAt'];
const ACTIVITY_INCLUDE = [{ model: User, as: 'createdByUser', required: false, attributes: ['id', 'name'] }];

async function queryActivities(where, limit) {
  return Activity.findAll({
    where,
    limit: parseInt(limit, 10),
    order: [['timestamp', 'DESC']],
    attributes: ACTIVITY_ATTRIBUTES,
    include: ACTIVITY_INCLUDE
  });
}

const activityService = {
  async getAllActivities(limit = 100, companyId = null) {
    try {
      const where = {};
      if (companyId) {
        where.companyId = companyId;
      }
      const activities = await queryActivities(where, limit);
      return activities;
    } catch (error) {
      logger.error('Error fetching all activities', error);
      throw new Error(`Failed to fetch activities: ${error.message}`);
    }
  },

  async getActivitiesByHead(head, limit = 100, companyId = null) {
    try {
      const where = { head };
      if (companyId) {
        where.companyId = companyId;
      }
      const activities = await queryActivities(where, limit);
      return activities;
    } catch (error) {
      logger.error(`Error fetching activities by head: ${head}`, error);
      throw new Error(`Failed to fetch activities by head: ${error.message}`);
    }
  },

  async createActivity(head, log, objectName = null, objectId = null, createdBy = null, companyId = null, type = null, transaction = null) {
    try {
      const options = transaction ? { transaction } : {};
      const activityData = {
        head,
        log,
        objectName,
        objectId
      };

      if (createdBy) {
        activityData.createdBy = createdBy;
      }

      if (companyId) {
        activityData.companyId = companyId;
      }

      if (type !== null && type !== undefined) {
        activityData.type = type;
      }

      // Initially set isConfirmed to false, will be updated after successful push
      activityData.isConfirmed = false;

      // Create activity in database first
      const activity = await Activity.create(activityData, options);

      // Prepare activity data for external API
      const activityPayload = {
        id: activity.id,
        head: activity.head,
        log: activity.log,
        timestamp: activity.timestamp,
        objectName: activity.objectName,
        objectId: activity.objectId,
        createdBy: activity.createdBy,
        companyId: activity.companyId,
        type: activity.type,
        createdAt: activity.createdAt,
        updatedAt: activity.updatedAt
      };

      // Push activity to external server
      try {
        const walletResponse = await pushActivityToExternalServer(activityPayload);
        // If push successful, update isConfirmed to true
        activity.isConfirmed = true;
        await activity.update({ isConfirmed: true }, options);
        logger.info(`Activity ${activity.id} successfully pushed and confirmed`);
        return walletResponse;
      } catch (pushError) {
        // Log error but don't fail the creation
        logger.error(`Failed to push activity ${activity.id} to external server`, pushError);
      }
    } catch (error) {
      logger.error('Error creating activity', error);
      throw new Error(`Failed to create activity: ${error.message}`);
    }
  }
};

module.exports = activityService;
