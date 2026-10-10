'use strict';
const logger = require('@startup/logger');
const {
  getKiteWithAccessToken,
  getCachedNfoInstruments,
  getCachedNiftyOptions,
  getCachedBankniftyOptions,
  getNiftySpotFromZerodha,
} = require('./kiteClient');

/**
 * Fetches NFO option instruments (CE/PE) for NIFTY and BANKNIFTY, sorted by expiry, returns first 100.
 */
async function getZerodhaInstruments() {
  const kite = getKiteWithAccessToken();
  await getCachedNfoInstruments(kite);
  const optionRows = [...getCachedNiftyOptions(), ...getCachedBankniftyOptions()].filter(
    (row) =>
      (row.instrument_type === "CE" || row.instrument_type === "PE") &&
      (row.name === "NIFTY" || row.name === "BANKNIFTY")
  );
  const sorted = optionRows.slice().sort((a, b) => {
    const expA = a.expiry ?? "";
    const expB = b.expiry ?? "";
    return String(expA).localeCompare(String(expB));
  });
  logger.info(`Total option instruments found ${sorted.length}`);
  return sorted.slice(0, 100);
}

const NIFTY_STRIKE_STEP = 50;
const NIFTY_ATM_STRIKES_RANGE = 5; // ±5 strikes around ATM
const NIFTY_STRIKE_RANGE_POINTS = NIFTY_ATM_STRIKES_RANGE * NIFTY_STRIKE_STEP; // 250 points

function normalizeExpiry(exp) {
  if (!exp) return "";

  if (exp instanceof Date) {
    return Number.isNaN(exp.getTime()) ? "" : exp.toISOString().slice(0, 10);
  }

  const expStr = String(exp).trim();
  if (!expStr) return "";

  const parsedDate = new Date(expStr);
  if (!Number.isNaN(parsedDate.getTime())) {
    return parsedDate.toISOString().slice(0, 10);
  }

  const isoMatch = expStr.match(/^(\d{4}-\d{2}-\d{2})/);
  return isoMatch ? isoMatch[1] : expStr;
}

function getAtmStrike(spotPrice) {
  return Math.round(spotPrice / NIFTY_STRIKE_STEP) * NIFTY_STRIKE_STEP;
}

function getUpcomingExpiryOptions(options) {
  const expiries = [
    ...new Set(options.map((r) => normalizeExpiry(r.expiry)).filter((exp) => exp && exp !== "2030-12-31")),
  ];

  expiries.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  const todayStr = new Date().toISOString().split("T")[0];
  const attemptedExpiries = [];
  let selectedExpiryStr = null;
  let expiryOptions = [];

  logger.info(`Today: ${todayStr}`);
  logger.info(`Available NIFTY expiries: ${JSON.stringify(expiries)}`);

  for (const exp of expiries) {
    logger.info(`Checking expiry: ${exp}`);
    if (exp >= todayStr) {
      const optionsForExp = options.filter((r) => normalizeExpiry(r.expiry) === exp);
      if (optionsForExp.length > 0) {
        selectedExpiryStr = exp;
        expiryOptions = optionsForExp;
        logger.info(`Using expiry: ${selectedExpiryStr}`);
        break;
      }
    }
    attemptedExpiries.push(exp);
  }

  return {
    attemptedExpiries,
    selectedExpiryStr,
    expiryOptions,
  };
}

function resolveClosestAtmOption(options, optionType, atmStrike) {
  const selectedInstrument = options
    .map((row) => {
      const strike = Number(row.strike ?? 0);
      const instrumentToken =
        typeof row.instrument_token === "number" ? row.instrument_token : Number(row.instrument_token);

      return {
        tradingsymbol: row.tradingsymbol,
        strike,
        instrumentToken: Number.isNaN(instrumentToken) ? undefined : instrumentToken,
        strikeDistance: Number.isNaN(strike) ? Number.POSITIVE_INFINITY : Math.abs(strike - atmStrike),
      };
    })
    .filter(({ tradingsymbol, strikeDistance }) => Boolean(tradingsymbol) && Number.isFinite(strikeDistance))
    .sort((a, b) => a.strikeDistance - b.strikeDistance || a.strike - b.strike)[0];

  if (!selectedInstrument?.tradingsymbol || !Number.isFinite(selectedInstrument.strike)) {
    logger.error(`[zerodhaService] Failed to resolve ATM option instrument optionType=${optionType} atmStrike=${atmStrike}`);
    return null;
  }

  return {
    tradingsymbol: selectedInstrument.tradingsymbol,
    strike: selectedInstrument.strike,
    instrumentToken: selectedInstrument.instrumentToken,
  };
}

async function getNiftyAtmOptionQuote(optionType) {
  const kite = getKiteWithAccessToken();
  const spotPrice = await getNiftySpotFromZerodha(kite);
  const atmStrike = getAtmStrike(spotPrice);

  await getCachedNfoInstruments(kite);
  const niftyOptions = getCachedNiftyOptions().filter(
    (row) => row.segment === "NFO-OPT" && row.instrument_type === optionType
  );

  if (niftyOptions.length === 0) {
    logger.error(`[zerodhaService] No cached NIFTY options found for signal trade optionType=${optionType}`);
    throw new Error(`No cached NIFTY ${optionType} options found`);
  }

  const { selectedExpiryStr, expiryOptions } = getUpcomingExpiryOptions(niftyOptions);
  if (!selectedExpiryStr || expiryOptions.length === 0) {
    logger.error(`[zerodhaService] No upcoming NIFTY expiry available for signal trade optionType=${optionType}`);
    throw new Error("No upcoming NIFTY expiry available");
  }

  const selectedInstrument = resolveClosestAtmOption(expiryOptions, optionType, atmStrike);

  if (!selectedInstrument?.tradingsymbol) {
    logger.error(`[zerodhaService] Failed to resolve ATM option instrument for signal trade optionType=${optionType} atmStrike=${atmStrike} selectedExpiry=${selectedExpiryStr}`);
    throw new Error("Failed to resolve ATM option instrument");
  }

  const key = `NFO:${selectedInstrument.tradingsymbol}`;
  logger.info(`[zerodhaService] Fetching option premium trade=BUY NIFTY ${selectedInstrument.strike} ${optionType} key=${key}`);

  const rawLtp = await kite.getLTP([key]);
  const quoteMap =
    rawLtp && typeof rawLtp.data === "object"
      ? rawLtp.data
      : rawLtp;
  const premium = Number(quoteMap?.[key]?.last_price);

  if (!Number.isFinite(premium) || premium <= 0) {
    logger.error(`[zerodhaService] Invalid option premium returned from Zerodha optionType=${optionType} key=${key} rawLtp=${JSON.stringify(rawLtp)}`);
    throw new Error("Invalid option premium returned from Zerodha");
  }

  return {
    trade: `BUY NIFTY ${selectedInstrument.strike} ${optionType}`,
    tradingsymbol: selectedInstrument.tradingsymbol,
    optionType,
    strike: selectedInstrument.strike,
    spotPrice,
    premium,
    instrumentToken: selectedInstrument.instrumentToken,
    selectedExpiry: selectedExpiryStr,
  };
}

async function getNearestExpiryNiftyOptions(strikeRange = 10) {
  const kite = getKiteWithAccessToken();
  const spotPrice = await getNiftySpotFromZerodha(kite);
  const atmStrike = getAtmStrike(spotPrice);
  const strikeRangePoints = strikeRange * NIFTY_STRIKE_STEP;
  const lowerStrike = atmStrike - strikeRangePoints;
  const upperStrike = atmStrike + strikeRangePoints;

  await getCachedNfoInstruments(kite);
  const niftyOptions = getCachedNiftyOptions().filter(
    (row) =>
      row.segment === "NFO-OPT" &&
      (row.instrument_type === "CE" || row.instrument_type === "PE")
  );

  if (niftyOptions.length === 0) {
    logger.error(`[zerodhaService] No cached NIFTY options found for snapshot collection`);
    throw new Error("No cached NIFTY option instruments found");
  }

  const { selectedExpiryStr, expiryOptions } = getUpcomingExpiryOptions(niftyOptions);
  if (!selectedExpiryStr || expiryOptions.length === 0) {
    logger.error(`[zerodhaService] No upcoming NIFTY expiry available for snapshot collection`);
    throw new Error("No upcoming NIFTY expiry available");
  }

  const options = [];
  for (const row of expiryOptions) {
    const strike = Number(row.strike ?? 0);
    const instrumentToken =
      typeof row.instrument_token === "number" ? row.instrument_token : Number(row.instrument_token);

    if (
      !row.tradingsymbol ||
      (row.instrument_type !== "CE" && row.instrument_type !== "PE") ||
      !Number.isFinite(strike) ||
      strike < lowerStrike ||
      strike > upperStrike
    ) {
      continue;
    }

    options.push({
      tradingsymbol: row.tradingsymbol,
      strike,
      optionType: row.instrument_type,
      instrumentToken: Number.isNaN(instrumentToken) ? undefined : instrumentToken,
    });
  }

  options.sort((a, b) => a.strike - b.strike || a.optionType.localeCompare(b.optionType));

  logger.info(`[zerodhaService] Nearest-expiry NIFTY options resolved spotPrice=${spotPrice} atmStrike=${atmStrike} selectedExpiry=${selectedExpiryStr} lowerStrike=${lowerStrike} upperStrike=${upperStrike} count=${options.length}`);

  return {
    spotPrice,
    atmStrike,
    selectedExpiry: selectedExpiryStr,
    options,
  };
}

module.exports = {
  NIFTY_STRIKE_STEP,
  NIFTY_ATM_STRIKES_RANGE,
  NIFTY_STRIKE_RANGE_POINTS,
  normalizeExpiry,
  getAtmStrike,
  getUpcomingExpiryOptions,
  resolveClosestAtmOption,
  getZerodhaInstruments,
  getNiftyAtmOptionQuote,
  getNearestExpiryNiftyOptions,
};
