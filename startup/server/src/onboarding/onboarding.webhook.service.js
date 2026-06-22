const logger = require('../../logger');
const onboardingOrderService = require('../services/onboardingOrder.service');
const { WEBHOOK_EVENTS } = require('../constants/onboarding/onboarding.constants');


const handleWebhookEvent = async (event) => {
  const type = event?.event;
  if (type !== WEBHOOK_EVENTS.PAYMENT_CAPTURED && type !== WEBHOOK_EVENTS.ORDER_PAID) {
    return; // not an event we act on
  }
  const payment = event?.payload?.payment?.entity;
  const orderEntity = event?.payload?.order?.entity;
  const orderId = payment?.order_id || orderEntity?.id;
  const paymentId = payment?.id || null;
  if (!orderId) {
    return;
  }
  const count = await onboardingOrderService.markPaid(orderId, paymentId, `webhook:${type}`);
  if (count) {
    logger.info(`Webhook ${type}: order ${orderId} marked paid (payment ${paymentId})`);
  }
};

module.exports = { handleWebhookEvent };
