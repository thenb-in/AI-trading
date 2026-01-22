const logger = require('../../../logger');
const { ACTIVITY_MISSING_REQUIRED_FIELDS } = require('../../constants/startup/errors');
const activityController = require('../../controllers/startup/activityController');


async function getAllActivities(req, res) {
  try {
    // Extract data from request
    const limit = req.query.limit || 100;
    const companyId = req.user?.company_id || null;

    // Call controller
    const result = await activityController.getAllActivities(limit, companyId);

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
    const companyId = req.user?.company_id || null;

    // Call controller
    const result = await activityController.getActivitiesByHead(head, limit, companyId);

    // Build and send response
    res.status(200).json(result);
  } catch (error) {
    logger.error(`Get activities by head error: ${req.params.head}`, error);
    res.status(500).json({ error: `Internal server error: ${error.message}` });
  }
}

async function createActivity(req, res) {
  try {
    // Extract data from request
    const { head, log, timestamp, objectName, objectId } = req.body;
    const createdBy = req.user?.id || null;
    const companyId = req.user?.company_id || null;

    // Validate required fields
    if (!head || !log || !timestamp) {
      return res.status(400).json({ error: ACTIVITY_MISSING_REQUIRED_FIELDS });
    }

    // Call controller
    const activity = await activityController.createActivity(head, log, timestamp, objectName, objectId, createdBy, companyId);

    // Build and send response
    res.status(201).json(activity);
  } catch (error) {
    logger.error('Create activity error', error);
    res.status(500).json({ error: `Internal server error: ${error.message}` });
  }
}

module.exports = {
  getAllActivities,
  getActivitiesByHead,
  createActivity
};

