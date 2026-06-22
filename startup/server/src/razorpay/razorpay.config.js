/**
 * Razorpay client setup. The SDK instance is built lazily and cached for the
 * process, so the server still boots when keys are absent (e.g. local dev
 * without payments) — callers get a clear 503 instead of a boot crash.
 *
 * KEY_SECRET stays here on the server and never reaches the browser.
 */
const Razorpay = require('razorpay');
const env = require('../config/env');

let razorpayClient = null;

const getRazorpayClient = () => {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    throw { status: 503, message: 'Payments are not configured. Please contact support.' };
  }
  if (!razorpayClient) {
    razorpayClient = new Razorpay({
      key_id: env.RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_KEY_SECRET
    });
  }
  return razorpayClient;
};

module.exports = { getRazorpayClient };
