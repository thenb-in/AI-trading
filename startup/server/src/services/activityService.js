// services/startup/activityService.js
const { pushActivityToExternalServer } = require('../../interfaces/wallet/activityInterface');
const logger = require('../../logger');
const { Activity, User } = require('../models');

const ACTIVITY_SUMMARY_ATTRIBUTES = ['id', 'head', 'log', 'timestamp', 'objectName', 'objectId', 'createdBy', 'companyId', 'isConfirmed', 'type', 'createdAt', 'updatedAt'];

const ACTIVITY_INCLUDE_CREATED_BY_USER = {
  model: User,
  as: 'createdByUser',
  required: false,
  attributes: ['id', 'name']
};

/**
 * Fetch activities matching `extraWhere` (plus `companyId` scope when supplied), newest first,
 * paginated by `limit`/`offset`. Used by every `getActivities*` variant — they differ only in
 * the where clause and the error context they want to log on failure.
 */
async function fetchActivities({ extraWhere = {}, limit = 100, offset = 0, companyId = null, errorContext, errorMessagePrefix }) {
  try {
    const where = { ...extraWhere };
    if (companyId) {
      where.companyId = companyId;
    }
    return await Activity.findAll({
      where,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10) || 0,
      order: [['timestamp', 'DESC']],
      attributes: ACTIVITY_SUMMARY_ATTRIBUTES,
      include: [ACTIVITY_INCLUDE_CREATED_BY_USER]
    });
  } catch (error) {
    logger.error(errorContext, error);
    throw new Error(`${errorMessagePrefix}: ${error.message}`);
  }
}

const activityService = {
  async getAllActivities(limit = 100, offset = 0, companyId = null) {
    return fetchActivities({
      limit, offset, companyId,
      errorContext: 'Error fetching all activities',
      errorMessagePrefix: 'Failed to fetch activities'
    });
  },

  async getActivitiesByHead(head, limit = 100, offset = 0, companyId = null) {
    return fetchActivities({
      extraWhere: { head },
      limit, offset, companyId,
      errorContext: `Error fetching activities by head: ${head}`,
      errorMessagePrefix: 'Failed to fetch activities by head'
    });
  },

  async getActivitiesByHeadAndObjectId(head, objectId, limit = 100, offset = 0, companyId = null) {
    return fetchActivities({
      extraWhere: { head, objectId: String(objectId) },
      limit, offset, companyId,
      errorContext: `Error fetching activities by head/objectId: head=${head} objectId=${objectId}`,
      errorMessagePrefix: 'Failed to fetch activities'
    });
  },

  async getActivitiesByHeadAndType(head, type, companyId = null, options = {}) {
    const { dateWhere = {}, attributes = ACTIVITY_SUMMARY_ATTRIBUTES, order = [['timestamp', 'DESC']] } = options;
    try {
      const where = {
        head,
        type,
        ...dateWhere
      };
      if (companyId) {
        where.companyId = companyId;
      }

      return await Activity.findAll({
        where,
        attributes,
        order,
        include: [ACTIVITY_INCLUDE_CREATED_BY_USER]
      });
    } catch (error) {
      logger.error(`Error fetching activities by head/type: head=${head} type=${type}`, error);
      throw new Error(`Failed to fetch activities: ${error.message}`);
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
