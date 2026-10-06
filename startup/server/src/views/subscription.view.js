const logger = require('../../logger');
const {
  HTTP_STATUS_CREATED,
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_INTERNAL_ERROR
} = require('../constants/http');
const subscriptionController = require('../controllers/subscription.controller');
const { sendSuccess, sendError } = require('../utils/response');

const createSubscription = async (req, res) => {
  try {
    const { name, description, isGlobal, permissions } = req.body;
    const {id:user_id, company_id}= req.user;
    const subscription = await subscriptionController.createSubscription(user_id,company_id,name,description,isGlobal,permissions);

    return sendSuccess(res, {
      statusCode: HTTP_STATUS_CREATED,
      data: subscription,
      message: isGlobal
        ? `Global subscription "${subscription.name}" created successfully!`
        : `Subscription "${subscription.name}" created successfully!`
    });
  } catch (error) {
    logger.error('Error creating subscription', error);
    return sendError(res, { statusCode: error.status || HTTP_STATUS_BAD_REQUEST, message: error.message });
  }
};

const getSubscriptions = async (req, res) => {
  try {
    const subscriptions = await subscriptionController.getSubscriptions(req.user.company_id);
    return sendSuccess(res, { data: subscriptions });
  } catch (error) {
    logger.error('Error fetching subscriptions', error);
    return sendError(res, { statusCode: error.status || HTTP_STATUS_INTERNAL_ERROR, message: error.message });
  }
};

const updateSubscriptionPermissions = async (req, res) => {
  try {
    const result = await subscriptionController.updateSubscriptionPermissions({
      subscriptionId: req.params.subscription_id,
      permissions: req.body.permissions,
      isGlobal: req.body.isGlobal,
      userId: req.user.id
    });
    return sendSuccess(res, { message: result.message, data: { applied: result.applied } });
  } catch (error) {
    logger.error('Error updating subscription permissions', error);
    return sendError(res, { statusCode: error.status || HTTP_STATUS_BAD_REQUEST, message: error.message });
  }
};

const exportSubscription = async (req, res) => {
  try {
    const data = await subscriptionController.exportSubscription(req.params.subscription_id);

    const safeName = (data.name || 'subscription').replace(/[^a-z0-9-_]+/gi, '_');
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="subscription_${safeName}.json"`);
    return res.send(JSON.stringify(data, null, 2));
  } catch (error) {
    logger.error('Error exporting subscription', error);
    return sendError(res, { statusCode: error.status || HTTP_STATUS_INTERNAL_ERROR, message: error.message });
  }
};

const importSubscription = async (req, res) => {
  try {
    const result = await subscriptionController.importSubscription({
      userId: req.user.id,
      companyId: req.user.company_id,
      payload: req.body
    });

    return sendSuccess(res, {
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
    return sendError(res, { statusCode: error.status || HTTP_STATUS_BAD_REQUEST, message: error.message });
  }
};

const pushSubscriptionToWallet = async (req, res) => {
  try {
    const result = await subscriptionController.pushToWallet(req.params.subscription_id, req.user.id);
    return sendSuccess(res, { data: result, message: `Plan "${result.name}" pushed to wallet` });
  } catch (error) {
    logger.error('Error pushing subscription to wallet', error);
    return sendError(res, { statusCode: error.status || HTTP_STATUS_INTERNAL_ERROR, message: error.message });
  }
};

const backfillSubscribedMasters = async (req, res) => {
  try {
    const apply = req.body?.apply === true;
    const result = await subscriptionController.backfillSubscribedMasters({ apply });
    const verb = apply ? 'Generated' : 'Found';
    return sendSuccess(res, {
      data: result,
      message: `${verb} ${result.total} missing permission(s) across ${result.subscriptions.length} subscription(s)`
    });
  } catch (error) {
    logger.error('Error backfilling subscribed-master permissions', error);
    return sendError(res, { statusCode: error.status || HTTP_STATUS_INTERNAL_ERROR, message: error.message });
  }
};

module.exports = {
  createSubscription,
  pushSubscriptionToWallet,
  backfillSubscribedMasters,
  getSubscriptions,
  updateSubscriptionPermissions,
  exportSubscription,
  importSubscription
};
