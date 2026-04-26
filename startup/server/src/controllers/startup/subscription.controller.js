const logger = require('../../../logger');
const subscriptionService = require('../../services/startup/subscription.service');


const createSubscription = async (req, res) => {
  try {
    const { name, description, isGlobal } = req.body;
    const companyId = isGlobal ? null : req.user.company_id;

    const newSubscription = await subscriptionService.createSubscription(name, description, companyId);
    res.json({
      success: true,
      message: `Subscription "${newSubscription.name}" created successfully!`,
      data: newSubscription
    });
  } catch (error) {
    logger.error('Error creating subscription', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

const getSubscriptions = async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const subscriptions = await subscriptionService.getSubscriptionsAndPermissions(companyId);
    res.json({
      success: true,
      data: subscriptions
    });
  } catch (error) {
    logger.error('Error fetching subscriptions', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getPermissions = async (req, res) => {
  try {
    const permissions = await subscriptionService.getAllPermissions();
    res.json({
      success: true,
      data: permissions
    });
  } catch (error) {
    logger.error('Error fetching permissions', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const updateSubscriptionPermissionStatus = async (req, res) => {
  try {
    const { subscription_id, permission_id, status } = req.body;
    const userId = req.user.id;

    if (!subscription_id || !permission_id || !status) {
      return res.status(400).json({
        success: false,
        message: 'subscription_id, permission_id, and status are required'
      });
    }

    const result = await subscriptionService.updateSubscriptionPermissionStatus(
      subscription_id,
      permission_id,
      status,
      userId
    );

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    logger.error('Error updating subscription permission status', error);
    const statusCode = error.status || 400;
    res.status(statusCode).json({
      success: false,
      message: error.message
    });
  }
};

const updateMultipleSubscriptionPermissionStatuses = async (req, res) => {
  try {
    const { subscription_id, permission_ids, status } = req.body;
    const userId = req.user.id;

    if (!subscription_id || !permission_ids || !status) {
      return res.status(400).json({
        success: false,
        message: 'subscription_id, permission_ids, and status are required'
      });
    }

    const result = await subscriptionService.updateMultipleSubscriptionPermissionStatuses(
      subscription_id,
      permission_ids,
      status,
      userId
    );

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    logger.error('Error updating subscription permission statuses', error);
    const statusCode = error.status || 400;
    res.status(statusCode).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  createSubscription,
  getSubscriptions,
  getPermissions,
  updateSubscriptionPermissionStatus,
  updateMultipleSubscriptionPermissionStatuses
};

