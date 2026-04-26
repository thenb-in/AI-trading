/**
 * Controller for company profile operations
 * Contains only business logic, no request/response handling
 */
const companyProfileService = require('../services/companyProfileService');

/**
 * Get company profile
 * @param {string} companyId - Company ID
 * @returns {Promise<object>} Company profile data
 */
async function getCompanyProfile(companyId) {
  return await companyProfileService.getCompanyProfile(companyId);
}

/**
 * Update company profile
 * @param {string} companyId - Company ID
 * @param {object} profileData - Profile data to update
 * @returns {Promise<object>} Updated company profile
 */
async function updateCompanyProfile(companyId, profileData) {
  return await companyProfileService.updateCompanyProfile(companyId, profileData);
}

module.exports = {
  getCompanyProfile,
  updateCompanyProfile
};
