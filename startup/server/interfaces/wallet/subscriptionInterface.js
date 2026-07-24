const axios = require('axios');
const logger = require('../../logger');
const env = require('../../src/config/env');
const { WALLET_PUSH_TIMEOUT_MS } = require('../../src/constants/subscription');


function buildWalletUrl(path, base = 'plan') {
  if (!env.WALLET_SERVER_URL) {
    throw { status: 503, message: 'Wallet not configured: WALLET_SERVER_URL is missing' };
  }
  return `${env.WALLET_SERVER_URL.replace(/\/+$/, '')}/${base}/${path}`;
}

function requireAppKey(appKey) {
  if (!appKey) {
    throw { status: 503, message: 'Wallet not configured: APP_KEY is missing' };
  }
}

/** Single place for the shared wallet HTTP call (URL build, logging, timeout, headers). */
async function walletRequest(method, path, { data, params, log, base } = {}) {
  const url = buildWalletUrl(path, base);
  if (log) {
    logger.info(`${log}: ${url}`);
  }
  return axios({
    method,
    url,
    data,
    params,
    timeout: WALLET_PUSH_TIMEOUT_MS,
    headers: { 'Content-Type': 'application/json' }
  });
}

/** Push one subscription create/update event to the wallet. */
async function pushSubscriptionToWallet(payload) {
  requireAppKey(env.APP_KEY);
  const response = await walletRequest('post', 'push', {
    data: payload,
    log: `Pushing subscription ${payload.subscriptionId} (${payload.action}) to wallet`
  });
  return { success: true, status: response.status, data: response.data };
}

/** Fetch this app's available plans (identified by appKey). */
async function fetchPlansFromWallet(appKey) {
  requireAppKey(appKey);
  const response = await walletRequest('get', 'plans', {
    params: { appKey },
    log: `Fetching plans from wallet appKey:${appKey}`
  });
  return response.data?.data || [];
}

/** company's full set of subscriptions on the wallet (adds new, removes dropped). */
async function syncCompanySubscriptionsToWallet({ companyId, companyName, planIds, heads, expiryDate, amount, paymentId }) {
  requireAppKey(env.APP_KEY);
  const response = await walletRequest('post', 'company-subscription/sync', {
    data: { appKey: env.APP_KEY, companyId, companyName, planIds, heads, expiryDate, amount, paymentId },
    base: 'subscription',
    log: `Syncing ${planIds.length} subscription(s) for company ${companyId} to wallet`
  });
  return { success: true, status: response.status, data: response.data };
}

/** Fetch available subscriptions (global + the given company), approved and pending. */
async function fetchAvailableSubscriptionsFromWallet(appKey, companyId) {
  requireAppKey(appKey);
  const response = await walletRequest('get', 'available', {
    params: { appKey, companyId },
    log: `Fetching available subscriptions from wallet (company ${companyId})`
  });
  return response.data?.data || [];
}

/** Fetch a company's actual subscriptions (with permissions) — what it HAS, for validation. */
async function fetchCompanySubscriptionsFromWallet(appKey, companyId) {
  requireAppKey(appKey);
  const response = await walletRequest('get', `company/${companyId}`, {
    base: 'subscription',
    params: { appKey },
    log: `Fetching company subscriptions from wallet (company ${companyId})`
  });
  return response.data?.data || [];
}

module.exports = {
  pushSubscriptionToWallet,
  fetchPlansFromWallet,
  syncCompanySubscriptionsToWallet,
  fetchAvailableSubscriptionsFromWallet,
  fetchCompanySubscriptionsFromWallet
};
