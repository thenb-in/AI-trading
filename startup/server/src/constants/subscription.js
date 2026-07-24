// Accepted status values for a SubscriptionPermission row.
const VALID_SUBSCRIPTION_STATUSES = ['subscribed', 'not_subscribed', 'hidden'];

// Implicit default when a permission has no explicit SubscriptionPermission row.
const DEFAULT_SUBSCRIPTION_STATUS = 'not_subscribed';


const EXPORTED_SUBSCRIPTION_STATUSES = ['subscribed', 'hidden'];

// Billing/usage "heads"
const SUBSCRIPTION_WALLET_HEADS = 'Employee';


// Timeout (ms) for the wallet subscription-push HTTP call.
const WALLET_PUSH_TIMEOUT_MS = 10000;

module.exports = {
  VALID_SUBSCRIPTION_STATUSES,
  DEFAULT_SUBSCRIPTION_STATUS,
  EXPORTED_SUBSCRIPTION_STATUSES,
  SUBSCRIPTION_WALLET_HEADS,
  WALLET_PUSH_TIMEOUT_MS
};
