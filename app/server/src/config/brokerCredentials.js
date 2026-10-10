'use strict';

// Safe, synchronous accessor for the company-level Zerodha broker credentials.
//
// Their HOME is now the CompanyProfile row (api key, api secret, access token);
// see MIGRATION.md and companyProfileTradingFields.js. This module is the read
// side the broker calls instead of touching process.env, plus the write side
// the post-login flow uses to persist a fresh access token (the daily
// hot-reload — no more rewriting .env).
//
// Hard guarantees (the broker and module-load paths may call this before the DB
// or company data exist):
//   - getBrokerCreds() is SYNCHRONOUS, NEVER throws, and NEVER blocks.
//   - With no cache yet it kicks a background load and returns empty-string creds.
//   - If the DB / company / profile is absent or a load fails, it returns the
//     last good cache, or empty strings. It never surfaces an error to the caller.
//
// Company resolution (single-tenant): the sole company is resolved through the
// framework companyService (getAllCompanies, first row) — no request context
// needed and no model is imported here. Its profile is read/written through
// companyProfileTradingService (the one owner of the CompanyProfile model).
//
// No circular require: this module requires logger + companyService +
// companyProfileTradingService (→ models) only, and nothing in that chain
// requires this module or the broker.
const logger = require('@startup/logger');
const companyService = require('@startup/src/services/companyService');
const companyProfileTradingService = require('../services/companyProfileTradingService');

// Empty-string creds so a cold/absent read is always a well-shaped object the
// broker's own "is required" guards can test (apiKey?.trim() etc.).
const EMPTY = Object.freeze({ apiKey: '', apiSecret: '', accessToken: '' });

const TTL_MS = 60_000;

let cache = null; // last good clean creds; null = never successfully loaded
let lastAttemptAt = 0; // when the last refresh attempt finished
let loading = false; // one in-flight refresh at a time

const str = (value) => (value === null || value === undefined ? '' : String(value));

// Map the CompanyProfile trading slice onto the broker's credential shape.
function toCreds(cfg) {
  if (!cfg) {
    return { ...EMPTY };
  }
  return {
    apiKey: str(cfg.zerodha_api_key),
    apiSecret: str(cfg.zerodha_api_secret),
    accessToken: str(cfg.zerodha_access_token)
  };
}

// Resolve the sole company id without a request context. Single-tenant: the
// first (only) company. Returns null when no company exists yet.
async function resolveCompanyId() {
  const companies = await companyService.getAllCompanies();
  return companies && companies.length ? companies[0].id : null;
}

// Reload the cache from the company profile. Awaitable, but callers never have
// to await it. Swallows every error and keeps the last good cache (or EMPTY).
async function refreshBrokerCreds() {
  if (loading) {
    return cache || { ...EMPTY };
  }
  loading = true;
  try {
    const companyId = await resolveCompanyId();
    if (companyId) {
      const cfg = await companyProfileTradingService.getTradingConfig(companyId);
      cache = toCreds(cfg);
    }
    return cache || { ...EMPTY };
  } catch (err) {
    logger.warn(`[brokerCredentials] refresh failed, serving ${cache ? 'cached' : 'empty'} creds: ${err instanceof Error ? err.message : err}`);
    return cache || { ...EMPTY };
  } finally {
    lastAttemptAt = Date.now();
    loading = false;
  }
}

// Synchronous, non-blocking, never-throwing. Returns cache when fresh; kicks a
// background refresh when cold or stale and returns the best value we have now.
function getBrokerCreds() {
  if (!cache || Date.now() - lastAttemptAt > TTL_MS) {
    refreshBrokerCreds().catch(() => {});
  }
  return cache || { ...EMPTY };
}

// Persist a fresh access token to the company's CompanyProfile AND update the
// in-memory cache immediately, so the very next getBrokerCreds() sees it. This
// is the post-OAuth hot-reload path. Failure to persist is surfaced via
// logger.error (a silently-lost token would break trading), but never thrown.
async function setAccessToken(token) {
  const accessToken = str(token);
  // Update cache immediately so in-process reads see the new token at once,
  // even if the DB write below is slow or fails.
  cache = { ...(cache || EMPTY), accessToken };
  try {
    const companyId = await resolveCompanyId();
    if (!companyId) {
      logger.error(`[brokerCredentials] cannot persist access token — no company resolved; token held in memory only`);
      return;
    }
    await companyProfileTradingService.updateTradingConfig(companyId, { zerodha_access_token: accessToken });
    logger.info(`[brokerCredentials] Zerodha access token persisted to company profile and cache`);
  } catch (err) {
    logger.error(`[brokerCredentials] FAILED to persist Zerodha access token (held in memory only — will be lost on restart): ${err instanceof Error ? err.message : err}`);
  }
}

// Periodic refresh so a profile edit lands without waiting for the next read.
// unref() so the timer never keeps the process alive.
const refreshTimer = setInterval(() => {
  refreshBrokerCreds().catch(() => {});
}, TTL_MS);
if (refreshTimer.unref) {
  refreshTimer.unref();
}

module.exports = { getBrokerCreds, refreshBrokerCreds, setAccessToken };
