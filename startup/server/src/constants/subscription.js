// The status a SubscriptionPermission row can carry. One source of truth for
// the value, so nothing has to spell the string out again.
const SUBSCRIPTION_STATUS = {
  SUBSCRIBED: 'subscribed',
  NOT_SUBSCRIBED: 'not_subscribed',
  HIDDEN: 'hidden'
};

// Accepted status values for a SubscriptionPermission row.
const VALID_SUBSCRIPTION_STATUSES = Object.values(SUBSCRIPTION_STATUS);

// Implicit default when a permission has no explicit SubscriptionPermission row.
const DEFAULT_SUBSCRIPTION_STATUS = SUBSCRIPTION_STATUS.NOT_SUBSCRIBED;


const EXPORTED_SUBSCRIPTION_STATUSES = [SUBSCRIPTION_STATUS.SUBSCRIBED, SUBSCRIPTION_STATUS.HIDDEN];


// Timeout (ms) for the wallet subscription-push HTTP call.
const WALLET_PUSH_TIMEOUT_MS = 10000;

module.exports = {
  SUBSCRIPTION_STATUS,
  VALID_SUBSCRIPTION_STATUSES,
  DEFAULT_SUBSCRIPTION_STATUS,
  EXPORTED_SUBSCRIPTION_STATUSES,
  WALLET_PUSH_TIMEOUT_MS
};
