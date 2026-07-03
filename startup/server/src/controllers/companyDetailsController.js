const companyDetailsService = require('../services/companyDetailsService');

async function getCompanyDetails(companyId) {
  return companyDetailsService.getCompanyDetails(companyId);
}

async function upsertCompanyDetails(companyId, data, userId, logoFile) {
  return companyDetailsService.upsertCompanyDetails(companyId, data, userId, logoFile);
}

module.exports = {
  getCompanyDetails,
  upsertCompanyDetails
};
