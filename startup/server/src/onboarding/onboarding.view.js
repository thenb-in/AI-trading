const logger = require('../../logger');
const {
  HTTP_STATUS_OK,
  HTTP_STATUS_CREATED,
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_INTERNAL_ERROR
} = require('../constants/http');
const onboardingController = require('./onboarding.controller');
const razorpayService = require('../razorpay/razorpay.service');
const { sequelizeErrors } = require('../constants/errors');
const { sendSuccess, sendError } = require('../utils/response');

/** GET /auth/plans — public plan catalogue with features. */
async function getPlans(req, res) {
  try {
    const plans = await onboardingController.getPlans();
    return sendSuccess(res, { statusCode: HTTP_STATUS_OK, data: { plans } });
  } catch (error) {
    logger.error('Get public plans error', error);
    return sendError(res, { message: `Failed to load plans: ${error.message}` });
  }
}

/** POST /auth/onboard — verify payment, then create company + admin user + plan. */
async function onboard(req, res) {
  try {
    const { subscriptionId, company, user, payment } = req.body;
    const result = await onboardingController.onboard({ subscriptionId, company, user, payment });
    return sendSuccess(res, {
      statusCode: HTTP_STATUS_CREATED,
      data: result,
      message: `Welcome aboard! ${result.company.name} is ready.`
    });
  } catch (error) {
    if (
      error.name === sequelizeErrors.SEQUELIZE_UNIQUE_CONSTRAINT_ERROR ||
      error.name === sequelizeErrors.SEQUELIZE_VALIDATION_ERROR
    ) {
      const detail = error.errors?.[0]?.message || error.message;
      const status = error.name === sequelizeErrors.SEQUELIZE_UNIQUE_CONSTRAINT_ERROR ? 409 : 400;
      return sendError(res, { statusCode: status, message: detail });
    }
    if (error.status) {
      return sendError(res, { statusCode: error.status, message: error.message });
    }
    logger.error('Onboarding error', error);
    return sendError(res, { message: error.message || 'Onboarding failed' });
  }
}

/**
 * POST /auth/razorpay/webhook — Razorpay server-to-server payment events.
 *
 * This is what makes provisioning resilient to the browser dying after payment:
 * Razorpay calls us directly (and retries for ~24h on non-2xx), so a captured
 * payment is recorded even if the client never completed /onboard.
 *
 * Signature is verified over the RAW body (req.rawBody, captured before JSON
 * parsing). On a bad/absent signature we 400. On a handler error we 500 so
 * Razorpay retries; the reconcile cron is the final backstop.
 */
async function razorpayWebhook(req, res) {
  const signature = req.headers['x-razorpay-signature'];
  if (!razorpayService.verifyWebhookSignature(req.rawBody, signature)) {
    logger.warn(`Razorpay webhook rejected: invalid or missing signature for ${req.originalUrl}`);
    return sendError(res, { statusCode: HTTP_STATUS_BAD_REQUEST, message: 'Invalid signature' });
  }
  try {
    await onboardingController.handleWebhook(req.body);
    return sendSuccess(res, { statusCode: HTTP_STATUS_OK, message: 'ok' });
  } catch (error) {
    logger.error('Razorpay webhook handling error', error);
    return sendError(res, {
      statusCode: HTTP_STATUS_INTERNAL_ERROR,
      message: `Webhook processing failed: ${error.message}`
    });
  }
}

module.exports = { getPlans, onboard, razorpayWebhook };
