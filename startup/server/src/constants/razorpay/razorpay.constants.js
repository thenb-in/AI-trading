// Constants for the Razorpay checkout flow.

// Razorpay's hard minimum order amount (paise).
const MIN_AMOUNT_PAISE = 100;

// Default order currency.
const DEFAULT_CURRENCY = 'INR';

// Razorpay caps the receipt field at 40 chars.
const RECEIPT_MAX_LENGTH = 40;

// Prefix for self-serve onboarding order receipts (onb_<subscriptionId>_<ts>).
const RECEIPT_PREFIX = 'onb_';

module.exports = {
  MIN_AMOUNT_PAISE,
  DEFAULT_CURRENCY,
  RECEIPT_MAX_LENGTH,
  RECEIPT_PREFIX
};
