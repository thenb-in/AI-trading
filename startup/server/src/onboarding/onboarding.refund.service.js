const logger = require('../../logger');
const razorpayService = require('../razorpay/razorpay.service');
const onboardingOrderService = require('../services/onboardingOrder.service');


const refundForFailedOnboarding = async ({ paymentId, orderId, cause }) => {
  try {
    const refund = await razorpayService.refundPayment({
      paymentId,
      notes: { reason: 'onboarding_failed', orderId }
    });
    logger.error(
      `Onboarding failed after payment ${paymentId} (order ${orderId}); payment refunded. Cause: ${cause?.message || cause}`
    );

    await onboardingOrderService
      .markRefunded(orderId, {
        refundId: refund?.id,
        paymentId,
        note: `onboarding_failed: ${cause?.message || cause}`
      })
      .catch((e) => logger.error(`Failed to mark order ${orderId} refunded`, e));
    return true;
  } catch (refundError) {
    logger.error(
      `CRITICAL: onboarding AND auto-refund both failed for payment ${paymentId} (order ${orderId}). Money is captured with no workspace — manual refund required.`,
      refundError
    );

    await onboardingOrderService
      .markPaid(orderId, paymentId, `refund_failed: ${refundError?.message || refundError}`)
      .catch((e) => logger.error(`Failed to mark order ${orderId} paid after refund failure`, e));
    return false;
  }
};

module.exports = { refundForFailedOnboarding };
