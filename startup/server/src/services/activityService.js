// services/startup/activityService.js
const { Op } = require('sequelize');
const { pushActivityToExternalServer } = require('../../interfaces/wallet/activityInterface');
const logger = require('../../logger');
const { Activity, User } = require('../models');
const { MAX_BATCH_SIZE } = require('../constants/undo');
const walletHeadsService = require('./walletHeadsService');

const ACTIVITY_SUMMARY_ATTRIBUTES = ['id', 'head', 'log', 'timestamp', 'objectName', 'objectId', 'createdBy', 'companyId', 'isConfirmed', 'type', 'batchId', 'createdAt', 'updatedAt'];

/** An undo of batch X is itself recorded as batch `undo:X` — no extra column needed. */
const undoBatchIdFor = (batchId) => `undo:${batchId}`;

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
    const query = {
      where,
      order: [['timestamp', 'DESC']],
      attributes: ACTIVITY_SUMMARY_ATTRIBUTES,
      include: [ACTIVITY_INCLUDE_CREATED_BY_USER]
    };
    if (limit !== null) {
      query.limit = parseInt(limit, 10);
      query.offset = parseInt(offset, 10) || 0;
    }

    return await Activity.findAll(query);
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

  async getActivitiesByHeadAndObjectIdInPeriod(head, objectId, start_date, end_date, companyId = null) {
    return fetchActivities({
      extraWhere: { head, objectId: String(objectId), created_at: { [Op.between]: [start_date, end_date] } },
      limit: null,
      companyId,
      errorContext: `Error fetching activities by head/objectId in period: head=${head} objectId=${objectId}`,
      errorMessagePrefix: 'Failed to fetch activities'
    });
  },

  async getActivitiesByHeadAndType(head, type, companyId = null, options = {}) {
    const {
      start_date,
      end_date,
      attributes = ACTIVITY_SUMMARY_ATTRIBUTES,
      order = [['timestamp', 'DESC']]
    } = options;
    try {
      const where = {
        head,
        type
      };
      if (companyId) {
        where.companyId = companyId;
      }
      if (start_date && end_date) {
        where.created_at = { [Op.between]: [start_date, end_date] };
      } else if (start_date) {
        where.created_at = { [Op.gte]: start_date };
      } else if (end_date) {
        where.created_at = { [Op.lte]: end_date };
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

  /** Every activity row in one batch — the raw material an undo replays. */
  async getActivitiesByBatchId(batchId, companyId = null) {
    return fetchActivities({
      extraWhere: { batchId },
      limit: MAX_BATCH_SIZE,
      companyId,
      errorContext: `Error fetching activities by batchId: ${batchId}`,
      errorMessagePrefix: 'Failed to fetch batch activities'
    });
  },

  async createActivity({
    head,
    log,
    objectName = null,
    objectId = null,
    createdBy = null,
    companyId = null,
    type = null,
    batchId = null,
    transaction = null
  }) {
    try {
      const options = transaction ? { transaction } : {};
      const activityData = {
        head,
        log,
        objectName,
        objectId,
        batchId
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

      // Send it on only if the wallet has a use for this head. The local
      // activity row is written either way — it is this app's audit trail and
      // its undo, and neither is the wallet's business. What the wallet wants
      // is a much shorter list: it prices or caps a handful of heads and drops
      // the rest, so the ones it drops need never be sent. See
      // walletHeadsService for what happens when we cannot ask.
      if (!await walletHeadsService.shouldPush(activity.head, activity.companyId)) {
        return { success: true, skipped: true, message: 'Head is not tracked by the wallet' };
      }

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
module.exports.undoBatchIdFor = undoBatchIdFor;
module.exports.MAX_BATCH_SIZE = MAX_BATCH_SIZE;
