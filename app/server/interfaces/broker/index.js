'use strict';
// Faithful migration of the legacy zerodhaService (1306 lines), split into
// cohesive behavior-preserving modules. This barrel re-exports the EXACT
// public surface the rest of the app imports via require('../broker').
const {
  ZERODHA_CALLBACK_URL,
  getZerodhaLoginURL,
  getZerodhaErrorMessage,
  getZerodhaErrorType,
  isZerodhaTokenError,
  generateZerodhaSession,
  buildKite,
  getCachedNfoInstruments,
  getCachedNiftyOptions,
  getCachedBankniftyOptions,
  getZerodhaProfile,
  getNiftySpotFromZerodha
} = require('./kiteClient');
const {
  getZerodhaInstruments,
  getNiftyAtmOptionQuote,
  getNearestExpiryNiftyOptions
} = require('./zerodhaInstruments');
const {
  getOptionQuotesByTradingSymbols,
  getNiftyPcrFromZerodha,
  getNiftyAtmPcr,
  getZerodhaLTP
} = require('./zerodhaQuotes');
const {
  calculateMaxPain,
  getOiBasedSupportResistance
} = require('./zerodhaOptionAnalytics');
const {
  fetchHistoricalCandles,
  fetchOptionCandles
} = require('./zerodhaHistorical');
const {
  saveNfoInstrumentsSnapshot,
  lookupOptionToken
} = require('./nfoInstrumentStore');

module.exports = {
  ZERODHA_CALLBACK_URL,
  getZerodhaLoginURL,
  getNiftySpotFromZerodha,
  getZerodhaErrorMessage,
  getZerodhaErrorType,
  isZerodhaTokenError,
  generateZerodhaSession,
  buildKite,
  getCachedNfoInstruments,
  getCachedNiftyOptions,
  getCachedBankniftyOptions,
  getZerodhaProfile,
  getZerodhaInstruments,
  getNiftyAtmOptionQuote,
  getNearestExpiryNiftyOptions,
  getOptionQuotesByTradingSymbols,
  getNiftyPcrFromZerodha,
  getNiftyAtmPcr,
  getZerodhaLTP,
  calculateMaxPain,
  getOiBasedSupportResistance,
  fetchHistoricalCandles,
  fetchOptionCandles,
  saveNfoInstrumentsSnapshot,
  lookupOptionToken
};
