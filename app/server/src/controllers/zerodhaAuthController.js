// Thin controller: no req/res, no models — orchestrates the broker + market-
// data services behind the Zerodha auth / diagnostics endpoints.
const broker = require('../services/broker');
const marketData = require('../services/market_data');
const tickerService = require('../services/tickerService');

function getLoginURL() {
  return broker.getZerodhaLoginURL();
}

function getErrorMessage(err) {
  return broker.getZerodhaErrorMessage(err);
}

// Exchange the daily request_token for an access token, then refresh everything
// that depends on the fresh daily token. Order preserved from source: session
// first, then invalidate the market cache, then restart the websocket ticker.
async function generateSession(requestToken) {
  await broker.generateZerodhaSession(requestToken);
  marketData.invalidateMarketCache(); // force fresh data on next frontend poll
  tickerService.restart();            // websocket needs the fresh daily token
}

async function getProfile() {
  return broker.getZerodhaProfile();
}

async function getInstruments() {
  return broker.getZerodhaInstruments();
}

async function getLTP(token) {
  return broker.getZerodhaLTP(token);
}

async function debugNifty() {
  return marketData.debugNiftyRaw();
}

async function debugNiftyIndices() {
  return marketData.debugNiftyIndices();
}

module.exports = {
  getLoginURL,
  getErrorMessage,
  generateSession,
  getProfile,
  getInstruments,
  getLTP,
  debugNifty,
  debugNiftyIndices,
};
