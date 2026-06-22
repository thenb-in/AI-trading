const logger = require('../../logger');
const razorpayService = require('../razorpay/razorpay.service');
const { validateOnboardInput } = require('./onboarding.validation');
const { createWorkspace } = require('./onboarding.workspace.service');
const { refundForFailedOnboarding } = require('./onboarding.refund.service');
const { getPublicPlans } = require('./onboarding.plans.service');
const { handleWebhookEvent } = require('./onboarding.webhook.service');
const { recoverPendingOrders } = require('./onboarding.recovery.service');


const onboard = async (payload) => {
  const input = validateOnboardInput(payload);
  const { orderId, paymentId, signature } = input.payment;


  if (!razorpayService.verifyPaymentSignature({ orderId, paymentId, signature })) {
    logger.warn(`Onboarding rejected: invalid Razorpay signature for order ${orderId}`);
    throw { status: 400, message: `Payment could not be verified for orderId : ${orderId}` };
  }

  try {
    return await createWorkspace(input);
  } catch (error) {
    const refunded = await refundForFailedOnboarding({ paymentId, orderId, cause: error });
    if (!refunded) {
      throw {
        status: 500,
        message: `We couldn't finish setting up your workspace and the automatic refund didn't go through. Please contact support with order id ${orderId} — we'll sort it out.`
      };
    }
    if (error.status && error.message) {
      throw {
        status: error.status,
        message: `${error.message} Your payment has been refunded — please try again.`
      };
    }
    // Unexpected failure: generic message, money already returned.
    throw {
      status: 502,
      message:
        'We couldn\'t set up your workspace, so your payment has been refunded. Please try again.'
    };
  }
};

module.exports = { getPublicPlans, onboard, handleWebhookEvent, recoverPendingOrders };
