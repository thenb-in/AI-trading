const crypto = require('crypto');
const env = require('../config/env');
const logger = require('../../logger');
const subscriptionService = require('../services/subscription');
const { fetchPlansFromWallet } = require('../../interfaces/wallet/subscriptionInterface');
const { getRazorpayClient } = require('./razorpay.config');
const {
  MIN_AMOUNT_PAISE,
  DEFAULT_CURRENCY,
  RECEIPT_MAX_LENGTH,
  RECEIPT_PREFIX
} = require('../constants/razorpay/razorpay.constants');

/**
 * Create a Razorpay order. Returns the order id + the public key id the browser
 * needs to open the checkout modal (never the secret).
 */
const createOrder = async ({ amount, currency = DEFAULT_CURRENCY, receipt }) => {
  const razorpay = getRazorpayClient();

  if (!Number.isInteger(amount) || amount < MIN_AMOUNT_PAISE) {
    throw { status: 400, message: `Amount must be at least ${MIN_AMOUNT_PAISE} paise` };
  }

  try {
    const order = await razorpay.orders.create({ amount, currency, receipt });
    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: env.RAZORPAY_KEY_ID
    };
  } catch (error) {
    // Razorpay SDK surfaces auth failures with statusCode 401.
    if (error?.statusCode === 401) {
      logger.error('Razorpay authentication failed — check RAZORPAY_KEY_ID/SECRET',error);
      throw { status: 401, message: `Payment gateway authentication failed ,${error}` };
    }
    logger.error(`Razorpay order creation failed: ${error?.error?.description || error?.message}`,error);
    throw { status: 500, message: 'Could not start payment. Please try again.' };
  }
};

/**
 * Verify the payment signature Razorpay sends back on success.
 * signature = HMAC_SHA256(order_id + '|' + payment_id, KEY_SECRET).
 * Returns true only on an exact, timing-safe match.
 */
const verifyPaymentSignature = ({ orderId, paymentId, signature }) => {
  if (!orderId || !paymentId || !signature) {
    return false;
  }

  const expected = crypto
    .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  const expectedBuf = Buffer.from(expected, 'utf8');
  const actualBuf = Buffer.from(signature, 'utf8');
  // timingSafeEqual throws on length mismatch — guard first.
  if (expectedBuf.length !== actualBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
};

/**
 * Verify a Razorpay webhook payload. The signature is HMAC_SHA256 of the EXACT
 * raw request body (not the re-serialized JSON) keyed by the webhook secret —
 * so the caller must pass the raw Buffer/string captured before body parsing.
 * Returns true only on a timing-safe match; false if no secret is configured.
 */
const verifyWebhookSignature = (rawBody, signature) => {
  if (!env.RAZORPAY_WEBHOOK_SECRET || !rawBody || !signature) {
    return false;
  }
  const payload = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody);
  const expected = crypto
    .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');

  const expectedBuf = Buffer.from(expected, 'utf8');
  const actualBuf = Buffer.from(signature, 'utf8');
  if (expectedBuf.length !== actualBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
};

/** Fetch an order from Razorpay (source of truth for the reconcile sweep). */
const fetchOrder = async (orderId) => {
  const razorpay = getRazorpayClient();
  return razorpay.orders.fetch(orderId);
};

/**
 * Fetch the payments made against an order. Used by reconcile to find the
 * captured payment id (needed to issue a refund) when no webhook recorded it.
 */
const fetchOrderPayments = async (orderId) => {
  const razorpay = getRazorpayClient();
  const result = await razorpay.orders.fetchPayments(orderId);
  return result?.items || [];
};

/**
 * Refund a captured payment in full. Used to undo a charge when a step AFTER the
 * payment (e.g. provisioning the workspace) fails, so the customer is never left
 * paying for something they didn't get. Amount is omitted → Razorpay refunds the
 * full captured amount. Throws on gateway error so the caller can escalate.
 */
const refundPayment = async ({ paymentId, notes }) => {
  if (!paymentId) {
    throw { status: 400, message: `paymentId is required to issue a refund (got: ${paymentId})` };
  }
  const razorpay = getRazorpayClient();
  return razorpay.payments.refund(paymentId, { notes });
};

/**
 * The price every self-serve plan is charged at — fixed server-side
 * (env.RAZORPAY_DEFAULT_AMOUNT, in paise) since plans have no per-plan price
 * column yet. Surfaced to the client so the plan cards / review screen can show
 * the price before checkout; the actual order is still priced here server-side.
 */
const getDefaultPricing = () => ({
  amount: env.RAZORPAY_DEFAULT_AMOUNT,
  currency: DEFAULT_CURRENCY
});

/**
 * Per-employee price (in paise) for a plan, sourced from the wallet (same value the
 * plan cards show). Throws if it can't be determined — we never charge a guessed price.
 */
const resolvePerEmployeeAmount = async (subscriptionId) => {
  const plans = await fetchPlansFromWallet(env.APP_KEY);
  const plan = plans.find((p) => String(p.id) === String(subscriptionId));
  if (!plan || typeof plan.amount !== 'number') {
    throw { status: 400, message: 'Could not determine the plan price. Please try again.' };
  }
  return Math.round(plan.amount * 100); // wallet stores rupees; Razorpay wants paise
};

/**
 * Create a Razorpay order for the chosen plan. Price is per employee, per year, so the
 * order total = per-employee price × team size (at least 1). Returns the order + the
 * public key id the browser needs to open checkout.
 */
const createOrderForPlan = async (subscriptionId, employeeCount = 1) => {
  if (!subscriptionId) {
    throw { status: 400, message: 'Please choose a plan' };
  }

  const count = Math.max(1, Math.floor(Number(employeeCount) || 1));
  const subscription = await subscriptionService.getGlobalPlanById(subscriptionId);
  const perEmployeeAmount = await resolvePerEmployeeAmount(subscriptionId);
  const amount = perEmployeeAmount * count;

  logger.info(`Order for plan ${subscriptionId}: ${perEmployeeAmount} paise/employee × ${count} = ${amount} paise`);

  const order = await createOrder({
    amount,
    currency: DEFAULT_CURRENCY,
    receipt: `${RECEIPT_PREFIX}${subscription.id}_${Date.now()}`.slice(0, RECEIPT_MAX_LENGTH)
  });

  return { ...order, planName: subscription.name };
};

module.exports = {
  createOrder,
  verifyPaymentSignature,
  verifyWebhookSignature,
  fetchOrder,
  fetchOrderPayments,
  refundPayment,
  createOrderForPlan,
  getDefaultPricing
};
