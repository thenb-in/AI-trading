// Thin controller: no req/res, no models — just delegates to the service.
const companyProfileTradingService = require('../services/companyProfileTradingService');

async function getTradingConfig(companyId) {
  return companyProfileTradingService.getTradingConfig(companyId);
}

async function updateTradingConfig(companyId, data) {
  return companyProfileTradingService.updateTradingConfig(companyId, data);
}

module.exports = {
  getTradingConfig,
  updateTradingConfig
};
