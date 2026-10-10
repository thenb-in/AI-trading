'use strict';
const { KiteConnect } = require('kiteconnect');
const fs = require('fs');
const path = require('path');
const logger = require('@startup/logger');
const env = require('../../config/env');

/** Redirect URL must match the one configured in Zerodha Kite Connect app dashboard. */
const ZERODHA_CALLBACK_URL = 'http://localhost:3000/api/v1/zerodha/callback';

const INSTRUMENT_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

let cachedSpotPrice = null;
let cachedSpotTimestamp = 0;
const SPOT_CACHE_TTL_MS = 10_000; // 10 seconds

let cachedInstruments = null;
let instrumentsLoaded = false;
let lastInstrumentLoad = 0;
let instrumentsLoadPromise = null;
let cachedNiftyOptions = [];
let cachedBankniftyOptions = [];

/**
 * Returns the Zerodha login URL. Logs "Redirecting user to Zerodha login".
 */
function getZerodhaLoginURL() {
  logger.info(`Redirecting user to Zerodha login`);
  const apiKey = env.ZERODHA_API_KEY;
  if (!apiKey?.trim()) {
    throw new Error("ZERODHA_API_KEY is required. Set ZERODHA_API_KEY in .env");
  }
  const kite = new KiteConnect({ api_key: apiKey });
  return kite.getLoginURL();
}

function getZerodhaProviderError(err) {
  if (!err || typeof err !== "object") {
    return null;
  }

  const maybeError = err;
  if (
    "message" in maybeError ||
    "error_type" in maybeError ||
    "status" in maybeError
  ) {
    return maybeError;
  }

  return null;
}

function getZerodhaErrorMessage(err) {
  if (err instanceof Error && err.message) {
    return err.message;
  }

  const providerError = getZerodhaProviderError(err);
  if (providerError?.message != null) {
    return String(providerError.message);
  }

  return "Unknown error";
}

function getZerodhaErrorType(err) {
  const providerError = getZerodhaProviderError(err);
  if (providerError?.error_type != null) {
    return String(providerError.error_type);
  }

  return null;
}

let _tokenExpiredLogged = false;

function isZerodhaTokenError(err) {
  const errorType = getZerodhaErrorType(err);
  const errorMessage = getZerodhaErrorMessage(err).toLowerCase();

  const isToken = (
    errorType === "TokenException" ||
    errorType === "PermissionException" ||
    errorMessage.includes("incorrect `api_key` or `access_token`") ||
    errorMessage.includes("access_token") ||
    errorMessage.includes("tokenexception") ||
    errorMessage.includes("permissionexception")
  );

  if (isToken && !_tokenExpiredLogged) {
    _tokenExpiredLogged = true;
    const apiKey = env.ZERODHA_API_KEY ?? '';
    const loginUrl = `https://kite.zerodha.com/connect/login?v=3&api_key=${apiKey}`;
    logger.error(`\n❌ Zerodha access token expired.\n   Login here to get a new token:\n   ${loginUrl}\n`);
  }

  return isToken;
}

/**
 * Exchanges request_token for session, sets access token on the client, returns the token.
 */
async function generateZerodhaSession(requestToken) {
  if (!requestToken?.trim()) {
    logger.error(`[zerodhaService] request_token is missing`);
    throw new Error("request_token is required");
  }
  const apiSecret = env.ZERODHA_API_SECRET;
  if (!apiSecret?.trim()) {
    logger.error(`[zerodhaService] ZERODHA_API_SECRET is not set in environment`);
    throw new Error("ZERODHA_API_SECRET is required. Set ZERODHA_API_SECRET in .env");
  }

  const apiKey = env.ZERODHA_API_KEY;
  if (!apiKey?.trim()) {
    throw new Error("ZERODHA_API_KEY is required. Set ZERODHA_API_KEY in .env");
  }
  logger.info(`Generating Zerodha session`);
  const kite = new KiteConnect({ api_key: apiKey });
  const session = await kite.generateSession(requestToken, apiSecret);

  const accessToken = session?.access_token;
  if (!accessToken) {
    logger.error(`[zerodhaService] generateSession did not return access_token session=${JSON.stringify(session)}`);
    throw new Error("Failed to get access_token from Zerodha");
  }

  kite.setAccessToken(session.access_token);
  logger.info(`Zerodha access token generated`);
  _tokenExpiredLogged = false; // reset so next expiry logs again

  saveZerodhaAccessTokenToEnv(accessToken);

  return accessToken;
}

/**
 * Returns a Kite Connect instance with access token set from .env (ZERODHA_ACCESS_TOKEN).
 * Use for API calls that require authentication (e.g. getProfile).
 */
function getKiteWithAccessToken() {
  const apiKey = env.ZERODHA_API_KEY;
  if (!apiKey?.trim()) {
    throw new Error("ZERODHA_API_KEY is required. Set ZERODHA_API_KEY in .env");
  }
  const accessToken = process.env.ZERODHA_ACCESS_TOKEN;
  if (!accessToken?.trim()) {
    throw new Error(
      "ZERODHA_ACCESS_TOKEN is required. Open /auth/zerodha/login, complete Zerodha login, then restart the server so the token saved to .env is loaded."
    );
  }
  const kite = new KiteConnect({ api_key: apiKey });
  kite.setAccessToken(accessToken);
  return kite;
}

async function getCachedNfoInstruments(kite) {
  const kiteClient = kite ?? getKiteWithAccessToken();
  const shouldRefresh =
    !instrumentsLoaded ||
    !cachedInstruments ||
    Date.now() - lastInstrumentLoad > INSTRUMENT_CACHE_TTL_MS;

  if (!shouldRefresh && cachedInstruments) {
    logger.info(`[zerodhaService] Using cached instruments`);
    return cachedInstruments;
  }

  if (instrumentsLoadPromise) {
    return instrumentsLoadPromise;
  }

  instrumentsLoadPromise = (async () => {
    try {
      logger.info(`[zerodhaService] Loading instruments from Zerodha...`);
      const instruments = await kiteClient.getInstruments("NFO");
      cachedInstruments = instruments;
      cachedNiftyOptions = cachedInstruments.filter(
        (i) => i.exchange === "NFO" && i.name === "NIFTY"
      );
      cachedBankniftyOptions = cachedInstruments.filter(
        (i) => i.exchange === "NFO" && i.name === "BANKNIFTY"
      );
      instrumentsLoaded = true;
      lastInstrumentLoad = Date.now();
      logger.info(`[zerodhaService] Instruments cached: ${cachedInstruments.length}`);
      logger.info(`[zerodhaService] NIFTY options: ${cachedNiftyOptions.length}`);
      logger.info(`[zerodhaService] BANKNIFTY options: ${cachedBankniftyOptions.length}`);
      return cachedInstruments;
    } catch (err) {
      logger.error(`[zerodhaService] Failed to load instruments err=${err}`);
      if (cachedInstruments) {
        logger.info(`[zerodhaService] Using cached instruments`);
        return cachedInstruments;
      }
      throw err;
    } finally {
      instrumentsLoadPromise = null;
    }
  })();

  return instrumentsLoadPromise;
}

function getCachedNiftyOptions() {
  return cachedNiftyOptions;
}

function getCachedBankniftyOptions() {
  return cachedBankniftyOptions;
}

/**
 * Fetches the Zerodha user profile via kite.getProfile().
 */
async function getZerodhaProfile() {
  const kite = getKiteWithAccessToken();
  const profile = await kite.getProfile();
  return profile;
}

/**
 * Fetches NIFTY spot from Zerodha with 3-tier fallback:
 *   Tier 1: kite.getQuote(["NSE:NIFTY 50"])
 *   Tier 2: kite.getHistoricalData(256265, "5minute", ...) — last candle close
 *   Tier 3: Return stale cached spot if available
 * Caches result for 10s to avoid redundant calls within a signal cycle.
 */
async function getNiftySpotFromZerodha(kite) {
  // Return fresh cache if available
  if (cachedSpotPrice !== null && Date.now() - cachedSpotTimestamp < SPOT_CACHE_TTL_MS) {
    return cachedSpotPrice;
  }

  if (!kite) kite = getKiteWithAccessToken();

  const errors = [];

  // Tier 1: getQuote
  try {
    const key = "NSE:NIFTY 50";
    const raw = await kite.getQuote([key]);
    const quoteMap =
      raw && typeof raw.data === "object"
        ? raw.data
        : raw;
    const spot = quoteMap?.[key]?.last_price;
    if (spot != null && typeof spot === "number" && spot > 0) {
      logger.info(`[zerodhaService] NIFTY spot via getQuote: ${spot}`);
      cachedSpotPrice = spot;
      cachedSpotTimestamp = Date.now();
      return spot;
    }
    errors.push({ tier: "getQuote", error: "last_price missing or invalid" });
  } catch (err) {
    errors.push({ tier: "getQuote", error: err });
    logger.warn(`[zerodhaService] NIFTY spot tier 1 (getQuote) failed, trying historical data error=${getZerodhaErrorMessage(err)}`);
  }

  // Tier 2: getHistoricalData — NIFTY 50 instrument token 256265, last 30 min of 5-minute candles
  try {
    const now = new Date();
    const from = new Date(now.getTime() - 30 * 60 * 1000); // 30 min ago
    const candles = await kite.getHistoricalData(
      256265,
      "5minute",
      from,
      now
    );
    const lastCandle = candles?.[candles.length - 1];
    const spot = lastCandle?.close;
    if (spot != null && typeof spot === "number" && spot > 0) {
      logger.info(`[zerodhaService] NIFTY spot via historicalData: ${spot}`);
      cachedSpotPrice = spot;
      cachedSpotTimestamp = Date.now();
      return spot;
    }
    errors.push({ tier: "historicalData", error: "no valid candle close" });
  } catch (err) {
    errors.push({ tier: "historicalData", error: err });
    logger.warn(`[zerodhaService] NIFTY spot tier 2 (historicalData) failed, checking stale cache error=${getZerodhaErrorMessage(err)}`);
  }

  // Tier 3: stale cached spot (better than crash)
  if (cachedSpotPrice !== null) {
    const staleSec = ((Date.now() - cachedSpotTimestamp) / 1000).toFixed(0);
    logger.warn(`[zerodhaService] NIFTY spot via stale cache (${staleSec}s old): ${cachedSpotPrice}`);
    return cachedSpotPrice;
  }

  // All tiers failed and no cache — log all errors and throw
  const tokenFailed = errors.some(e => isZerodhaTokenError(e.error));
  if (tokenFailed) {
    const apiKey = env.ZERODHA_API_KEY ?? '';
    const loginUrl = `https://kite.zerodha.com/connect/login?v=3&api_key=${apiKey}`;
    logger.error(`\n❌ Zerodha access token expired. Login here to get a new one:\n   ${loginUrl}\n`);
  } else {
    logger.error(`[zerodhaService] getNiftySpotFromZerodha all tiers failed errors=${JSON.stringify(errors)}`);
  }
  throw new Error("Could not get NIFTY 50 spot from Zerodha (all fallback tiers exhausted)");
}

const ENV_FILE = path.join(process.cwd(), ".env");
const ENV_KEY = "ZERODHA_ACCESS_TOKEN";

/**
 * Writes the access token to .env (updates ZERODHA_ACCESS_TOKEN or appends it).
 */
function saveZerodhaAccessTokenToEnv(accessToken) {
  try {
    let content = "";
    try {
      content = fs.readFileSync(ENV_FILE, "utf8");
    } catch {
      content = "";
    }
    const lines = content.split(/\r?\n/);
    const keyPrefix = `${ENV_KEY}=`;
    let found = false;
    const newLines = lines.map((line) => {
      if (line.startsWith(keyPrefix)) {
        found = true;
        return `${keyPrefix}${accessToken}`;
      }
      return line;
    });
    if (!found) {
      if (newLines.length > 0 && !newLines[newLines.length - 1].trim()) {
        newLines.pop();
      }
      newLines.push("");
      newLines.push(`# Zerodha access token (set automatically after login)`);
      newLines.push(`${keyPrefix}${accessToken}`);
    }
    fs.writeFileSync(ENV_FILE, newLines.join("\n") + (content.endsWith("\n") ? "" : "\n"), "utf8");
    process.env.ZERODHA_ACCESS_TOKEN = accessToken; // hot-reload into running process
    logger.info(`[zerodhaService] Access token saved to .env and reloaded into process`);
  } catch (err) {
    logger.error(`[zerodhaService] Failed to save access token to .env ${err}`);
  }
}

module.exports = {
  ZERODHA_CALLBACK_URL,
  getZerodhaLoginURL,
  getZerodhaProviderError,
  getZerodhaErrorMessage,
  getZerodhaErrorType,
  isZerodhaTokenError,
  generateZerodhaSession,
  getKiteWithAccessToken,
  getCachedNfoInstruments,
  getCachedNiftyOptions,
  getCachedBankniftyOptions,
  getZerodhaProfile,
  getNiftySpotFromZerodha,
  saveZerodhaAccessTokenToEnv,
};
