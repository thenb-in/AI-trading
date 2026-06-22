// Strip characters that could be used for HTML/script injection from free-text
// fields before they enter state. A light client-side guard — the server still
// validates and sanitises.
const sanitize = (value) => value.replace(/[<>&]/g, '');


const formatPrice = (amountMinor, currency = 'INR') => {
  if (amountMinor == null) return null;
  const major = amountMinor / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: Number.isInteger(major) ? 0 : 2
  }).format(major);
};

const RAZORPAY_CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

/**
 * Lazily inject the Razorpay Checkout script and resolve once it's ready.
 * Loads only when the user reaches payment (not on every page). Resolves true
 * on success, false if the script can't be loaded (offline / blocked).
 */
const loadRazorpayCheckout = () =>
  new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const existing = document.querySelector(`script[src="${RAZORPAY_CHECKOUT_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(true));
      existing.addEventListener('error', () => resolve(false));
      return;
    }
    const script = document.createElement('script');
    script.src = RAZORPAY_CHECKOUT_SRC;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

export { sanitize, formatPrice, loadRazorpayCheckout };
