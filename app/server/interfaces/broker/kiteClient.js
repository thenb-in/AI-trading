'use strict';
const { KiteConnect } = require('kiteconnect');
const logger = require('@startup/logger');
const env = require('@appServer/src/config/env');
const brokerCredentials = require('@appServer/src/config/brokerCredentials');

/** Redirect URL must match the one configured in the Zerodha Kite Connect app
 *  dashboard. Sourced from env (ZERODHA_CALLBACK_URL) so it tracks the deploy's
 *  host/port instead of a hard-coded localhost. */
const ZERODHA_CALLBACK_URL = env.ZERODHA_CALLBACK_URL;

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
  const apiKey = brokerCredentials.getBrokerCreds().apiKey;
  if (!apiKey?.trim()) {
    throw new Error("ZERODHA_API_KEY is required. Set it in Company Settings (Company Profile → trading).");
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
    const apiKey = brokerCredentials.getBrokerCreds().apiKey ?? '';
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
  const creds = brokerCredentials.getBrokerCreds();
  const apiSecret = creds.apiSecret;
  if (!apiSecret?.trim()) {
    logger.error(`[zerodhaService] ZERODHA_API_SECRET is not configured in Company Settings`);
    throw new Error("ZERODHA_API_SECRET is required. Set it in Company Settings (Company Profile → trading).");
  }

  const apiKey = creds.apiKey;
  if (!apiKey?.trim()) {
    throw new Error("ZERODHA_API_KEY is required. Set it in Company Settings (Company Profile → trading).");
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

  await saveZerodhaAccessToken(accessToken);

  return accessToken;
}

/**
 * Returns a Kite Connect instance with the company's access token set.
 * Credentials come from Company Settings (Company Profile → trading).
 * Use for API calls that require authentication (e.g. getProfile).
 */
function getKiteWithAccessToken() {
  const creds = brokerCredentials.getBrokerCreds();
  const apiKey = creds.apiKey;
  if (!apiKey?.trim()) {
    throw new Error("ZERODHA_API_KEY is required. Set it in Company Settings (Company Profile → trading).");
  }
  const accessToken = creds.accessToken;
  if (!accessToken?.trim()) {
    throw new Error(
      "ZERODHA_ACCESS_TOKEN is required. Open /auth/zerodha/login and complete Zerodha login — the token is saved to Company Settings and picked up automatically, no restart needed."
    );
  }
  const kite = new KiteConnect({ api_key: apiKey });
  kite.setAccessToken(accessToken);
  return kite;
}

/**
 * Builds a Kite Connect client from the company's credentials WITHOUT the
 * access-token guard — the single shared way to construct an authed client for
 * callers that manage their own no-token/error handling (quotes, order desk,
 * websocket). Behavior-identical to the per-service construction it replaces,
 * so a missing token surfaces as the broker's own token error (which callers
 * recognise via isZerodhaTokenError) rather than a thrown precondition.
 */
function buildKite() {
  const creds = brokerCredentials.getBrokerCreds();
  const kite = new KiteConnect({ api_key: creds.apiKey });
  kite.setAccessToken(creds.accessToken);
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
    const apiKey = brokerCredentials.getBrokerCreds().apiKey ?? '';
    const loginUrl = `https://kite.zerodha.com/connect/login?v=3&api_key=${apiKey}`;
    logger.error(`\n❌ Zerodha access token expired. Login here to get a new one:\n   ${loginUrl}\n`);
  } else {
    logger.error(`[zerodhaService] getNiftySpotFromZerodha all tiers failed errors=${JSON.stringify(errors)}`);
  }
  throw new Error("Could not get NIFTY 50 spot from Zerodha (all fallback tiers exhausted)");
}

/**
 * Persists the access token to the company's Company Profile and updates the
 * in-memory broker-credentials cache, so the very next read picks it up with no
 * restart (the daily hot-reload). Persist failures are logged by the accessor.
 */
async function saveZerodhaAccessToken(accessToken) {
  await brokerCredentials.setAccessToken(accessToken);
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
  buildKite,
  getCachedNfoInstruments,
  getCachedNiftyOptions,
  getCachedBankniftyOptions,
  getZerodhaProfile,
  getNiftySpotFromZerodha,
  saveZerodhaAccessToken,
};
