const logger = require('../../logger');
const subscriptionService = require('../services/subscription.service');
const userService = require('../services/userService');
const {
  ONLY_SUPERADMINS_CAN_CREATE_GLOBAL_SUBSCRIPTIONS,
  ONLY_SUPERADMINS_CAN_IMPORT_GLOBAL_SUBSCRIPTIONS
} = require('../constants/errors');


const callerIsSupportUser = async (userId) => {
  const user = await userService.getUserById(userId);
  return !!user.isSupportUser;
};

const createSubscription = async (req, res) => {
  try {
    const { name, description, isGlobal } = req.body;

    if (isGlobal && !(await callerIsSupportUser(req.user.id))) {
      return res.status(403).json({
        success: false,
        message: ONLY_SUPERADMINS_CAN_CREATE_GLOBAL_SUBSCRIPTIONS
      });
    }

    const companyId = isGlobal ? null : req.user.company_id;

    const newSubscription = await subscriptionService.createSubscription(name, description, companyId);
    res.json({
      success: true,
      message: isGlobal
        ? `Global subscription "${newSubscription.name}" created successfully!`
        : `Subscription "${newSubscription.name}" created successfully!`,
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

const exportSubscription = async (req, res) => {
  try {
    const subscriptionId = req.params.subscription_id;
    const data = await subscriptionService.exportSubscription(subscriptionId);

    const safeName = (data.name || 'subscription').replace(/[^a-z0-9-_]+/gi, '_');
    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="subscription_${safeName}.json"`
    );
    res.send(JSON.stringify(data, null, 2));
  } catch (error) {
    logger.error('Error exporting subscription', error);
    const statusCode = error.status || 500;
    res.status(statusCode).json({
      success: false,
      message: error.message
    });
  }
};

const importSubscription = async (req, res) => {
  try {
    const payload = req.body;

    if (payload?.isGlobal && !(await callerIsSupportUser(req.user.id))) {
      return res.status(403).json({
        success: false,
        message: ONLY_SUPERADMINS_CAN_IMPORT_GLOBAL_SUBSCRIPTIONS
      });
    }

    const result = await subscriptionService.importSubscription(payload, req.user.company_id);

    res.json({
      success: true,
      message: result.created
        ? `Subscription "${result.subscription.name}" imported successfully (${result.applied} permission(s) applied)`
        : `Subscription "${result.subscription.name}" updated — ${result.applied} permission(s) applied, ${result.reset} removed`,
      data: {
        id: result.subscription.id,
        name: result.subscription.name,
        created: result.created,
        applied: result.applied,
        reset: result.reset
      }
    });
  } catch (error) {
    logger.error('Error importing subscription', error);
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
  updateMultipleSubscriptionPermissionStatuses,
  exportSubscription,
  importSubscription
};

