const logger = require('../../logger');
const { ACTIVITY_MISSING_REQUIRED_FIELDS } = require('../constants/errors');
const activityController = require('../controllers/activityController');


async function getAllActivities(req, res) {
  try {
    // Extract data from request
    const limit = req.query.limit || 100;
    const offset = req.query.offset || 0;
    const companyId = req.user?.company_id || null;

    // Call controller
    const result = await activityController.getAllActivities(limit, offset, companyId);

    // Build and send response
    res.status(200).json(result);
  } catch (error) {
    logger.error('Get all activities error', error);
    res.status(500).json({ error: `Internal server error: ${error.message}` });
  }
}


async function getActivitiesByHead(req, res) {
  try {
    // Extract data from request
    const { head } = req.params;
    const limit = req.query.limit || 100;
    const offset = req.query.offset || 0;
    const companyId = req.user?.company_id || null;

    // Call controller
    const result = await activityController.getActivitiesByHead(head, limit, offset, companyId);

    // Build and send response
    res.status(200).json(result);
  } catch (error) {
    logger.error(`Get activities by head error: ${req.params.head}`, error);
    res.status(500).json({ error: `Internal server error: ${error.message}` });
  }
}

async function getActivitiesByHeadAndObjectId(req, res) {
  try {
    const { head, objectId } = req.params;
    const limit = req.query.limit || 100;
    const offset = req.query.offset || 0;
    const companyId = req.user?.company_id || null;

    const result = await activityController.getActivitiesByHeadAndObjectId(head, objectId, limit, offset, companyId);
    res.status(200).json(result);
  } catch (error) {
    logger.error(`Get activities by head/objectId error: head=${req.params?.head} objectId=${req.params?.objectId}`, error);
    res.status(500).json({ error: `Internal server error: ${error.message}` });
  }
}

async function createActivity(req, res) {
  try {
    // Extract data from request
    const { head, log, timestamp, objectName, objectId, type, isConfirmed } = req.body;
    const createdBy = req.user?.id || null;
    const companyId = req.user?.company_id || null;

    // Validate required fields
    if (!head || !log || !timestamp) {
      return res.status(400).json({ error: ACTIVITY_MISSING_REQUIRED_FIELDS });
    }

    // Call controller
    const result = await activityController.createActivity(head, log, timestamp, objectName, objectId, createdBy, companyId, type, isConfirmed);

    // Build and send response with 202 status code and message
    res.status(202).json({
      message: result.message,
      activity: result.activity,
      isConfirmed: result.isConfirmed
    });
  } catch (error) {
    logger.error('Create activity error', error);
    res.status(500).json({ error: `Internal server error: ${error.message}` });
  }
}

module.exports = {
  getAllActivities,
  getActivitiesByHead,
  getActivitiesByHeadAndObjectId,
  createActivity
};

