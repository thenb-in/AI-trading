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


const hasWallet = (appKey = env.APP_KEY) => Boolean(appKey) && env.SECURE_COOKIE;

const walletConfigSummary = () =>
  `APP_KEY ${env.APP_KEY ? 'set' : 'empty'}, SECURE_COOKIE ${env.SECURE_COOKIE}, WALLET_SERVER_URL=${env.WALLET_SERVER_URL}`;

if (!hasWallet()) {
  logger.warn(`Wallet sync disabled, subscriptions stay local — ${walletConfigSummary()}`);
}

/** Result for a wallet call that was skipped because no wallet is configured. */
const skipped = (reason) => {
  logger.info(`Wallet sync skipped (${walletConfigSummary()}): ${reason}`);
  return { success: true, skipped: true };
};

/**
 * Pull the `data` array out of a wallet response. A 200 whose body is not the
 * shape we expect is an upstream failure, NOT "zero results" — surface it as an
 * error (502) and log it, so it can never masquerade as a legitimately empty
 * list. Callers that want to degrade (validation, badges) already catch.
 */
function unwrapWalletData(response, context) {
  const data = response.data?.data;
  if (!Array.isArray(data)) {
    const bodyKeys = Object.keys(response.data || {}).join(', ') || 'none';
    logger.error(`Wallet returned an unexpected shape for ${context} (HTTP ${response.status}, body keys: ${bodyKeys}) — expected data[] array, treating as failure not empty`);
    throw { status: 502, message: `Wallet returned an unexpected response for ${context}` };
  }
  return data;
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
  if (!hasWallet()) {
    return skipped(`subscription ${payload.subscriptionId} (${payload.action}) stays local`);
  }
  const response = await walletRequest('post', 'push', {
    data: payload,
    log: `Pushing subscription ${payload.subscriptionId} (${payload.action}) to wallet`
  });
  return { success: true, status: response.status, data: response.data };
}

/** Fetch this app's available plans (identified by appKey). */
async function fetchPlansFromWallet(appKey) {
  if (!hasWallet(appKey)) {
    return [];
  }
  const response = await walletRequest('get', 'plans', {
    params: { appKey },
    log: `Fetching plans from wallet appKey:${appKey}`
  });
  return unwrapWalletData(response, `plans (appKey ${appKey})`);
}

/** company's full set of subscriptions on the wallet (adds new, removes dropped). */
async function syncCompanySubscriptionsToWallet({ companyId, companyName, planIds, heads, expiryDate, amount, paymentId }) {
  if (!hasWallet()) {
    return skipped(`${planIds.length} subscription(s) for company ${companyId} stay local`);
  }
  const response = await walletRequest('post', 'company-subscription/sync', {
    data: { appKey: env.APP_KEY, companyId, companyName, planIds, heads, expiryDate, amount, paymentId },
    base: 'subscription',
    log: `Syncing ${planIds.length} subscription(s) for company ${companyId} to wallet`
  });
  return { success: true, status: response.status, data: response.data };
}

/** Fetch available subscriptions (global + the given company), approved and pending. */
async function fetchAvailableSubscriptionsFromWallet(appKey, companyId) {
  if (!hasWallet(appKey)) {
    return [];
  }
  const response = await walletRequest('get', 'available', {
    params: { appKey, companyId },
    log: `Fetching available subscriptions from wallet (company ${companyId})`
  });
  return unwrapWalletData(response, `available subscriptions (company ${companyId})`);
}

/** Fetch a company's actual subscriptions (with permissions) — what it HAS, for validation. */
async function fetchCompanySubscriptionsFromWallet(appKey, companyId) {
  if (!hasWallet(appKey)) {
    return [];
  }
  const response = await walletRequest('get', `company/${companyId}`, {
    base: 'subscription',
    params: { appKey },
    log: `Fetching company subscriptions from wallet (company ${companyId})`
  });
  return unwrapWalletData(response, `company subscriptions (company ${companyId})`);
}

module.exports = {
  hasWallet,
  pushSubscriptionToWallet,
  fetchPlansFromWallet,
  syncCompanySubscriptionsToWallet,
  fetchAvailableSubscriptionsFromWallet,
  fetchCompanySubscriptionsFromWallet
};
