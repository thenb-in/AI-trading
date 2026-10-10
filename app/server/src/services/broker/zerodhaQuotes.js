'use strict';
const logger = require('@startup/logger');
const {
  getKiteWithAccessToken,
  getCachedNfoInstruments,
  getCachedNiftyOptions,
  getCachedBankniftyOptions,
  getNiftySpotFromZerodha,
} = require('./kiteClient');
const {
  getAtmStrike,
  getUpcomingExpiryOptions,
  resolveClosestAtmOption,
} = require('./zerodhaInstruments');

function interpretationFromPcr(pcr) {
  if (pcr > 1.1) return "bearish (more put OI)";
  if (pcr < 0.9) return "bullish (more call OI)";
  return "neutral";
}

async function getOptionQuotesByTradingSymbols(tradingSymbols) {
  const kite = getKiteWithAccessToken();
  const uniqueSymbols = Array.from(
    new Set(tradingSymbols.map((symbol) => symbol.trim()).filter(Boolean))
  );

  if (uniqueSymbols.length === 0) {
    return {};
  }

  const quoteKeys = uniqueSymbols.map((symbol) => `NFO:${symbol}`);
  logger.info(`[zerodhaService] Fetching quote snapshots count=${quoteKeys.length}`);

  try {
    const rawQuote = await kite.getQuote(quoteKeys);
    const quoteMap =
      rawQuote && typeof rawQuote.data === "object"
        ? rawQuote.data
        : rawQuote;

    return uniqueSymbols.reduce((acc, symbol) => {
      const key = `NFO:${symbol}`;
      const quote = quoteMap?.[key];
      const oi = Number(quote?.oi ?? quote?.open_interest);
      const ltp = Number(quote?.last_price);
      const volume = Number(quote?.volume ?? quote?.volume_traded);

      acc[symbol] = {
        tradingsymbol: symbol,
        oi: Number.isFinite(oi) ? oi : null,
        ltp: Number.isFinite(ltp) ? ltp : null,
        volume: Number.isFinite(volume) ? volume : null,
      };
      return acc;
    }, {});
  } catch (err) {
    logger.error(`[zerodhaService] Failed to fetch quote snapshots err=${err} count=${quoteKeys.length}`);
    throw err;
  }
}

/**
 * Computes PCR from Zerodha NIFTY option OI using the nearest-expiry ATM CE/PE pair.
 * Uses cached instruments and reads OI from kite.getQuote().
 */
async function getNiftyPcrFromZerodha() {
  const kite = getKiteWithAccessToken();
  const niftyPrice = await getNiftySpotFromZerodha(kite);
  const atmStrike = getAtmStrike(niftyPrice);
  logger.info(`[zerodhaService] PCR spot price: ${niftyPrice}`);
  logger.info(`[zerodhaService] PCR ATM strike: ${atmStrike}`);

  await getCachedNfoInstruments(kite);
  const niftyOptions = getCachedNiftyOptions().filter((r) => r.segment === "NFO-OPT");
  if (niftyOptions.length === 0) {
    logger.error(`[zerodhaService] No NIFTY option instruments found (name=NIFTY, segment=NFO-OPT)`);
    throw new Error("No NIFTY option instruments found");
  }

  const { attemptedExpiries, selectedExpiryStr, expiryOptions } =
    getUpcomingExpiryOptions(niftyOptions);

  if (expiryOptions.length === 0) {
    logger.error(`[zerodhaService] Could not determine nearest NIFTY expiry`);
    return {
      totalCE_OI: 0,
      totalPE_OI: 0,
      pcr: null,
      interpretation: "insufficient data",
      error: "No valid NIFTY expiry available",
      verification: {
        atm_strike: atmStrike,
        strikes_used: [],
        ce_oi: 0,
        pe_oi: 0,
        pcr: null,
        selected_instruments: [],
        attempted_expiries: [],
        selected_expiry: null,
      },
    };
  }

  if (!selectedExpiryStr) {
    logger.error(`[zerodhaService] No instruments for any NIFTY expiry attempted_expiries=${JSON.stringify(attemptedExpiries)}`);
    return {
      totalCE_OI: 0,
      totalPE_OI: 0,
      pcr: null,
      interpretation: "insufficient data",
      error: "No NIFTY option instruments found",
      verification: {
        atm_strike: atmStrike,
        strikes_used: [],
        ce_oi: 0,
        pe_oi: 0,
        pcr: null,
        selected_instruments: [],
        attempted_expiries: Array.from(new Set(attemptedExpiries)),
        selected_expiry: null,
      },
    };
  }

  const ceInstrument = resolveClosestAtmOption(
    expiryOptions.filter((row) => row.instrument_type === "CE"),
    "CE",
    atmStrike
  );
  const peInstrument = resolveClosestAtmOption(
    expiryOptions.filter((row) => row.instrument_type === "PE"),
    "PE",
    atmStrike
  );

  if (!ceInstrument?.tradingsymbol || !peInstrument?.tradingsymbol) {
    const error = "Unable to resolve ATM CE/PE symbols from cached Zerodha instruments";
    logger.error(`[zerodhaService] PCR symbol resolution failed atmStrike=${atmStrike} selectedExpiry=${selectedExpiryStr} ceSymbol=${ceInstrument?.tradingsymbol} peSymbol=${peInstrument?.tradingsymbol}`);
    return {
      totalCE_OI: 0,
      totalPE_OI: 0,
      pcr: null,
      interpretation: "insufficient data",
      error,
      verification: {
        atm_strike: atmStrike,
        strikes_used: [],
        ce_oi: 0,
        pe_oi: 0,
        pcr: null,
        selected_instruments: [],
        attempted_expiries: Array.from(new Set(attemptedExpiries)),
        selected_expiry: selectedExpiryStr,
      },
    };
  }

  const ceKey = `NFO:${ceInstrument.tradingsymbol}`;
  const peKey = `NFO:${peInstrument.tradingsymbol}`;
  logger.info(`[zerodhaService] PCR CE symbol: ${ceKey}`);
  logger.info(`[zerodhaService] PCR PE symbol: ${peKey}`);
  logger.info(`[zerodhaService] PCR fetching quote keys: ${JSON.stringify([ceKey, peKey])}`);

  try {
    const rawQuote = await kite.getQuote([ceKey, peKey]);

    const quoteMap =
      rawQuote && typeof rawQuote.data === "object"
        ? rawQuote.data
        : rawQuote;
    const ceQuote = quoteMap?.[ceKey];
    const peQuote = quoteMap?.[peKey];
    const totalCE_OI = Number(ceQuote?.oi ?? ceQuote?.open_interest);
    const totalPE_OI = Number(peQuote?.oi ?? peQuote?.open_interest);
    const ceOi = Number.isFinite(totalCE_OI) ? totalCE_OI : 0;
    const peOi = Number.isFinite(totalPE_OI) ? totalPE_OI : 0;
    const ceOiAvailable = ceQuote?.oi != null || ceQuote?.open_interest != null;
    const peOiAvailable = peQuote?.oi != null || peQuote?.open_interest != null;

    logger.info(`[zerodhaService] PCR CE fetched OI: symbol=${ceInstrument.tradingsymbol} strike=${ceInstrument.strike} oi=${ceOi} rawOi=${ceQuote?.oi ?? ceQuote?.open_interest ?? null}`);
    logger.info(`[zerodhaService] PCR PE fetched OI: symbol=${peInstrument.tradingsymbol} strike=${peInstrument.strike} oi=${peOi} rawOi=${peQuote?.oi ?? peQuote?.open_interest ?? null}`);

    if (!ceOiAvailable || !peOiAvailable) {
      const error = "OI data unavailable from Zerodha. Market may be closed or quotes are incomplete.";
      logger.error(`[zerodhaService] PCR OI unavailable ceSymbol=${ceInstrument.tradingsymbol} peSymbol=${peInstrument.tradingsymbol} ceQuote=${JSON.stringify(ceQuote)} peQuote=${JSON.stringify(peQuote)}`);
      return {
        totalCE_OI: ceOi,
        totalPE_OI: peOi,
        pcr: null,
        interpretation: "insufficient data",
        error,
        verification: {
          atm_strike: atmStrike,
          strikes_used: [
            { strike: ceInstrument.strike, instrument_type: "CE", oi: ceOi },
            { strike: peInstrument.strike, instrument_type: "PE", oi: peOi },
          ],
          ce_oi: ceOi,
          pe_oi: peOi,
          pcr: null,
          selected_instruments: [
            {
              tradingsymbol: ceInstrument.tradingsymbol,
              strike: ceInstrument.strike,
              instrument_token: ceInstrument.instrumentToken,
            },
            {
              tradingsymbol: peInstrument.tradingsymbol,
              strike: peInstrument.strike,
              instrument_token: peInstrument.instrumentToken,
            },
          ],
          attempted_expiries: Array.from(new Set(attemptedExpiries)),
          selected_expiry: selectedExpiryStr,
        },
      };
    }

    const pcr = ceOi > 0 ? peOi / ceOi : null;
    logger.info(`[zerodhaService] PCR totals spot=${niftyPrice} atmStrike=${atmStrike} ceOi=${ceOi} peOi=${peOi} pcr=${pcr}`);

    const interpretation =
      pcr != null ? interpretationFromPcr(pcr) : "insufficient data";
    logger.info(`[zerodhaService] Computed real PCR from Zerodha option OI`);
    return {
      totalCE_OI: ceOi,
      totalPE_OI: peOi,
      pcr,
      interpretation,
      verification: {
        atm_strike: atmStrike,
        strikes_used: [
          { strike: ceInstrument.strike, instrument_type: "CE", oi: ceOi },
          { strike: peInstrument.strike, instrument_type: "PE", oi: peOi },
        ],
        ce_oi: ceOi,
        pe_oi: peOi,
        pcr,
        selected_instruments: [
          {
            tradingsymbol: ceInstrument.tradingsymbol,
            strike: ceInstrument.strike,
            instrument_token: ceInstrument.instrumentToken,
          },
          {
            tradingsymbol: peInstrument.tradingsymbol,
            strike: peInstrument.strike,
            instrument_token: peInstrument.instrumentToken,
          },
        ],
        attempted_expiries: Array.from(new Set(attemptedExpiries)),
        selected_expiry: selectedExpiryStr,
      },
    };
  } catch (err) {
    logger.error(`[zerodhaService] getNiftyPcrFromZerodha getQuote failed err=${err}`);
    throw err;
  }
}

async function getNiftyAtmPcr() {
  try {
    const pcrResult = await getNiftyPcrFromZerodha();
    if (pcrResult.pcr == null || !Number.isFinite(pcrResult.pcr)) {
      logger.error(`[zerodhaService] ATM PCR unavailable, using neutral fallback error=${pcrResult.error} verification=${JSON.stringify(pcrResult.verification)}`);
      return 0.5;
    }

    const normalizedPcr = Math.max(0, Math.min(1, pcrResult.pcr));
    logger.info(`[zerodhaService] ATM PCR resolved rawPcr=${pcrResult.pcr} normalizedPcr=${normalizedPcr} atmStrike=${pcrResult.verification.atm_strike} selectedExpiry=${pcrResult.verification.selected_expiry}`);
    return normalizedPcr;
  } catch (err) {
    logger.error(`[zerodhaService] Failed to fetch ATM PCR, using neutral fallback err=${err}`);
    return 0.5;
  }
}

/**
 * Fetches last traded price (LTP) for an NFO instrument by instrument_token.
 * @param instrumentToken - instrument_token from instruments list (e.g. 14021378)
 */
async function getZerodhaLTP(instrumentToken) {
  const kite = getKiteWithAccessToken();
  logger.info(`Fetching LTP for instrument`);
  try {
    await getCachedNfoInstruments(kite);
    const optionUniverse = [...getCachedNiftyOptions(), ...getCachedBankniftyOptions()];
    const tokenStr = String(instrumentToken).trim();
    const row = optionUniverse.find(
      (r) => String(r.instrument_token ?? "") === tokenStr
    );
    if (!row?.tradingsymbol) {
      logger.error(`[zerodhaService] Instrument not found for token instrumentToken=${instrumentToken}`);
      throw new Error(`Instrument not found for token: ${instrumentToken}`);
    }
    const key = `NFO:${row.tradingsymbol}`;
    const ltp = await kite.getLTP([key]);
    return ltp;
  } catch (err) {
    logger.error(`[zerodhaService] getLTP failed instrumentToken=${instrumentToken} err=${err}`);
    throw err;
  }
}

module.exports = {
  interpretationFromPcr,
  getOptionQuotesByTradingSymbols,
  getNiftyPcrFromZerodha,
  getNiftyAtmPcr,
  getZerodhaLTP,
};
