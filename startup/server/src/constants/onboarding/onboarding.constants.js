// Constants for the public self-serve onboarding flow.

// bcrypt cost factor for hashing the admin password.
const SALT_ROUNDS = 10;

// SubscriptionPermission status that marks a permission as part of a plan.
const SUBSCRIBED_STATUS = 'subscribed';

// Minimum admin password length accepted at signup.
const MIN_PASSWORD_LENGTH = 6;

// Lifecycle states of an onboarding order (see models/OnboardingOrder.js).
const ORDER_STATUS = {
  CREATED: 'created',
  PAID: 'paid',
  PROVISIONED: 'provisioned',
  REFUNDED: 'refunded',
  FAILED: 'failed'
};

// Razorpay webhook events we act on.
const WEBHOOK_EVENTS = {
  PAYMENT_CAPTURED: 'payment.captured',
  ORDER_PAID: 'order.paid'
};

module.exports = {
  SALT_ROUNDS,
  SUBSCRIBED_STATUS,
  MIN_PASSWORD_LENGTH,
  ORDER_STATUS,
  WEBHOOK_EVENTS
};
