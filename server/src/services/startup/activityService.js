// services/startup/activityService.js
const { Op: _Op } = require('sequelize');
const logger = require('../../../logger');
// Activity is the primary model for this service
const { Activity, User } = require('../../models');

const activityService = {
  async getAllActivities(limit = 100, companyId = null) {
    try {
      const where = {};
      if (companyId) {
        where.companyId = companyId;
      }

      const activities = await Activity.findAll({
        where,
        limit: parseInt(limit, 10),
        order: [['timestamp', 'DESC']],
        attributes: ['id', 'head', 'log', 'timestamp', 'objectName', 'objectId', 'createdBy', 'companyId', 'createdAt', 'updatedAt'],
        include: [
          {
            model: User,
            as: 'createdByUser',
            required: false,
            attributes: ['id', 'name']
          }
        ]
      });
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

      const activities = await Activity.findAll({
        where,
        limit: parseInt(limit, 10),
        order: [['timestamp', 'DESC']],
        attributes: ['id', 'head', 'log', 'timestamp', 'objectName', 'objectId', 'createdBy', 'companyId', 'createdAt', 'updatedAt'],
        include: [
          {
            model: User,
            as: 'createdByUser',
            required: false,
            attributes: ['id', 'name']
          }
        ]
      });
      return activities;
    } catch (error) {
      logger.error(`Error fetching activities by head: ${head}`, error);
      throw new Error(`Failed to fetch activities by head: ${error.message}`);
    }
  },

  async createActivity(head, log, timestamp, objectName = null, objectId = null, createdBy = null, companyId = null, transaction = null) {
    try {
      const options = transaction ? { transaction } : {};
      const activityData = {
        head,
        log,
        timestamp,
        objectName,
        objectId
      };

      if (createdBy) {
        activityData.createdBy = createdBy;
      }

      if (companyId) {
        activityData.companyId = companyId;
      }

      const activity = await Activity.create(activityData, options);
      return activity;
    } catch (error) {
      logger.error('Error creating activity', error);
      throw new Error(`Failed to create activity: ${error.message}`);
    }
  }
};

module.exports = activityService;
