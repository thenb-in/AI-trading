const { Op } = require('sequelize');
const { OnboardingOrder } = require('../models');
const logger = require('../../logger');
const { ORDER_STATUS } = require('../constants/onboarding/onboarding.constants');

const onboardingOrderService = {

  async createOrderRecord({ razorpayOrderId, subscriptionId, amount, currency }, transaction = null) {
    return OnboardingOrder.create(
      {
        razorpay_order_id: razorpayOrderId,
        subscription_id: subscriptionId || null,
        amount,
        currency,
        status: ORDER_STATUS.CREATED
      },
      { transaction }
    );
  },


  async getByOrderId(razorpayOrderId, transaction = null) {
    return OnboardingOrder.findOne({
      where: { razorpay_order_id: razorpayOrderId },
      transaction
    });
  },

  async markPaid(razorpayOrderId, paymentId, note = null) {
    const [count] = await OnboardingOrder.update(
      { status: ORDER_STATUS.PAID, razorpay_payment_id: paymentId, ...(note ? { notes: note } : {}) },
      { where: { razorpay_order_id: razorpayOrderId, status: ORDER_STATUS.CREATED } }
    );
    return count;
  },


  async markProvisioned(razorpayOrderId, { companyId, paymentId }, transaction = null) {
    const [count] = await OnboardingOrder.update(
      { status: ORDER_STATUS.PROVISIONED, company_id: companyId, razorpay_payment_id: paymentId },
      { where: { razorpay_order_id: razorpayOrderId }, transaction }
    );
    if (!count) {
      // Not fatal — an order created before this table existed still provisions.
      logger.warn(`No onboarding_order row for ${razorpayOrderId} to mark provisioned`);
    }
    return count;
  },


  async markRefunded(razorpayOrderId, { refundId, paymentId, note }) {
    const [count] = await OnboardingOrder.update(
      {
        status: ORDER_STATUS.REFUNDED,
        razorpay_refund_id: refundId || null,
        ...(paymentId ? { razorpay_payment_id: paymentId } : {}),
        notes: note || null
      },
      { where: { razorpay_order_id: razorpayOrderId } }
    );
    return count;
  },


  async markFailed(razorpayOrderId, note = null) {
    const [count] = await OnboardingOrder.update(
      { status: ORDER_STATUS.FAILED, notes: note },
      { where: { razorpay_order_id: razorpayOrderId } }
    );
    return count;
  },


  async findStaleOpenOrders(staleBefore) {
    return OnboardingOrder.findAll({
      where: {
        status: { [Op.in]: [ORDER_STATUS.CREATED, ORDER_STATUS.PAID] },
        updatedAt: { [Op.lt]: staleBefore }
      },
      order: [['updatedAt', 'ASC']]
    });
  },

  async markWalletSynced(razorpayOrderId, transaction = null) {
    const [count] = await OnboardingOrder.update(
      { wallet_synced: true },
      { where: { razorpay_order_id: razorpayOrderId }, transaction }
    );
    return count;
  },

  // Provisioned orders whose subscription never made it to the wallet — to retry.
  async findProvisionedUnsynced(limit = 50) {
    return OnboardingOrder.findAll({
      where: { status: ORDER_STATUS.PROVISIONED, wallet_synced: false },
      order: [['updatedAt', 'ASC']],
      limit
    });
  }
};

module.exports = onboardingOrderService;
