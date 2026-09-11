const logger = require('../../../logger');
const notificationRuleController = require('./notificationRuleController');
const { sendSuccess, sendError } = require('../../utils/response');
const { HTTP_STATUS_NOT_FOUND } = require('../../constants/http');

async function getRules(req, res) {
  try {
    const { columns, data } = await notificationRuleController.list(req.user?.company_id);
    return sendSuccess(res, { data: { columns, rules: data } });
  } catch (error) {
    logger.error(`[notification-rules] list failed: ${error.message}`, error);
    return sendError(res, { error });
  }
}

async function createRule(req, res) {
  try {
    const rule = await notificationRuleController.create(
      req.body,
      req.user?.company_id,
      req.user?.id
    );
    return sendSuccess(res, { data: rule, message: `${rule.name} created` });
  } catch (error) {
    logger.error(`[notification-rules] create failed: ${error.message}`, error);
    return sendError(res, { error });
  }
}

async function updateRule(req, res) {
  try {
    const { id } = req.params;
    const rule = await notificationRuleController.update(id, req.user?.company_id, req.body);
    if (!rule) {
      return sendError(res, {
        statusCode: HTTP_STATUS_NOT_FOUND,
        message: `No notification rule ${id} in this company`
      });
    }
    return sendSuccess(res, { data: rule, message: `${rule.name} updated` });
  } catch (error) {
    logger.error(`[notification-rules] update ${req.params?.id} failed: ${error.message}`, error);
    return sendError(res, { error });
  }
}

async function deleteRule(req, res) {
  try {
    const { id } = req.params;
    const removed = await notificationRuleController.remove(id, req.user?.company_id);
    if (!removed) {
      return sendError(res, {
        statusCode: HTTP_STATUS_NOT_FOUND,
        message: `No notification rule ${id} in this company`
      });
    }
    return sendSuccess(res, { message: `Notification rule ${id} deleted` });
  } catch (error) {
    logger.error(`[notification-rules] delete ${req.params?.id} failed: ${error.message}`, error);
    return sendError(res, { error });
  }
}

async function sendRuleNow(req, res) {
  try {
    const { id } = req.params;
    const summary = await notificationRuleController.sendNow(id, req.user?.company_id);
    if (!summary) {
      return sendError(res, {
        statusCode: HTTP_STATUS_NOT_FOUND,
        message: `No notification rule ${id} in this company`
      });
    }
    return sendSuccess(res, { data: summary });
  } catch (error) {
    logger.error(`[notification-rules] send-now ${req.params?.id} failed: ${error.message}`, error);
    return sendError(res, { error });
  }
}

module.exports = { getRules, createRule, updateRule, deleteRule, sendRuleNow };
