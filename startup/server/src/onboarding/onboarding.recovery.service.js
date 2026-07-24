const logger = require('../../logger');
const env = require('../config/env');
const razorpayService = require('../razorpay/razorpay.service');
const onboardingOrderService = require('../services/onboardingOrder.service');
const companyService = require('../services/companyService');
const companyProfileService = require('../services/companyProfileService');
const { syncWorkspaceToWallet } = require('./onboarding.workspace.service');


const recoverPendingWalletSyncs = async () => {
  const orders = await onboardingOrderService.findProvisionedUnsynced();
  let synced = 0;
  for (const order of orders) {
    try {
      const company = await companyService.getCompanyById(order.company_id);
      const profile = await companyProfileService.getCompanyProfile(order.company_id);
      await syncWorkspaceToWallet({
        companyId: order.company_id,
        companyName: company?.name,
        subscriptionId: order.subscription_id,
        employeeCount: profile?.establishment_employee_count ?? null,
        amount: order.amount !== null ? order.amount / 100 : null,
        paymentId: order.razorpay_payment_id
      });
      await onboardingOrderService.markWalletSynced(order.razorpay_order_id);
      synced += 1;
    } catch (error) {
      logger.warn(`Wallet re-sync still failing for order ${order.razorpay_order_id}: ${error.message}`);
    }
  }
  if (orders.length) {
    logger.info(`Onboarding wallet re-sync: scanned=${orders.length} synced=${synced}`);
  }
  return { scanned: orders.length, synced };
};


const recoverOneOrder = async (order, nowMs, expiryMs) => {
  const orderId = order.razorpay_order_id;
  const rzpOrder = await razorpayService.fetchOrder(orderId);

  if (rzpOrder?.status !== 'paid') {
    const ageMs = nowMs - new Date(order.updatedAt).getTime();
    if (ageMs > expiryMs) {
      await onboardingOrderService.markFailed(orderId, `abandoned: order ${orderId} never paid`);
      return 'failed';
    }
    return null;
  }

  const payments = await razorpayService.fetchOrderPayments(orderId);
  const captured = payments.find((p) => p.status === 'captured' || p.status === 'refunded');
  if (!captured) {
    logger.warn(`Recovery: order ${orderId} is paid but has no captured payment — skipping`);
    return null;
  }

  const fullyRefunded =
    captured.status === 'refunded' || Number(captured.amount_refunded) >= Number(captured.amount);
  if (fullyRefunded) {
    await onboardingOrderService.markRefunded(orderId, {
      paymentId: captured.id,
      note: `recovery: order ${orderId} already refunded at gateway`
    });
    return 'refunded';
  }

  const refund = await razorpayService.refundPayment({
    paymentId: captured.id,
    notes: { reason: 'onboarding_unprovisioned_recovery', orderId }
  });
  await onboardingOrderService.markRefunded(orderId, {
    refundId: refund?.id,
    paymentId: captured.id,
    note: `recovery: order ${orderId} paid but never provisioned`
  });
  logger.warn(
    `Recovery refunded order ${orderId} (payment ${captured.id}) — captured but never provisioned`
  );
  return 'refunded';
};


const recoverPendingOrders = async () => {
  // Retry wallet mirrors first — independent of payment-gateway config.
  await recoverPendingWalletSyncs();

  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    return { scanned: 0, refunded: 0, failed: 0, skipped: 'payments_not_configured' };
  }
  const nowMs = Date.now();
  const graceMs = env.ONBOARDING_ORDER_GRACE_MINUTES * 60 * 1000;
  const expiryMs = env.ONBOARDING_ORDER_EXPIRY_MINUTES * 60 * 1000;
  const orders = await onboardingOrderService.findStaleOpenOrders(new Date(nowMs - graceMs));

  let refunded = 0;
  let failed = 0;
  for (const order of orders) {
    try {
      const outcome = await recoverOneOrder(order, nowMs, expiryMs);
      if (outcome === 'refunded') {
        refunded += 1;
      } else if (outcome === 'failed') {
        failed += 1;
      }
    } catch (error) {
      logger.error(`Recovery error for order ${order.razorpay_order_id}: ${error.message}`, error);
    }
  }
  if (orders.length) {
    logger.info(`Onboarding recovery: scanned=${orders.length} refunded=${refunded} failed=${failed}`);
  }
  return { scanned: orders.length, refunded, failed };
};

module.exports = { recoverPendingOrders, recoverPendingWalletSyncs };
