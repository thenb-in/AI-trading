const logger = require('../../logger');
const { HTTP_STATUS_CREATED } = require('../constants/http');
const razorpayController = require('./razorpay.controller');
const { sendSuccess, sendError } = require('../utils/response');

/** POST /auth/payment/order — create a Razorpay order for the chosen plan. */
async function createOrder(req, res) {
  try {
    const { subscriptionId, employeeCount } = req.body;
    const order = await razorpayController.createOrder(subscriptionId, employeeCount);
    return sendSuccess(res, { statusCode: HTTP_STATUS_CREATED, data: order });
  } catch (error) {
    if (error.status) {
      return sendError(res, { statusCode: error.status, message: error.message });
    }
    logger.error('Create order error', error);
    return sendError(res, { message: `Could not start payment , ${error.message}` });
  }
}

module.exports = { createOrder };
