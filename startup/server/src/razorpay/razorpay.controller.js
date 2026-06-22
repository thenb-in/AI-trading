const razorpayService = require('./razorpay.service');
const onboardingOrderService = require('../services/onboardingOrder.service');

const razorpayController = {
  /**
   * Create a Razorpay order for the chosen plan and record it locally. The local
   * record is what lets the webhook + reconcile sweep later detect a payment
   * that was captured but never provisioned — so if we can't persist it, we fail
   * the order rather than hand the user a checkout we can't track.
   * @param {string} subscriptionId - Plan (global subscription) to pay for
   * @returns {Promise<object>} { orderId, amount, currency, keyId, planName }
   */
  async createOrder(subscriptionId) {
    const order = await razorpayService.createOrderForPlan(subscriptionId);
    await onboardingOrderService.createOrderRecord({
      razorpayOrderId: order.orderId,
      subscriptionId,
      amount: order.amount,
      currency: order.currency
    });
    return order;
  }
};

module.exports = razorpayController;
