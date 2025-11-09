const { CompanyProfile, Company } = require('../models');
const logger = require('../../logger');

const companyProfileService = {
  async getCompanyProfile(companyId) {
    try {
      const companyProfile = await CompanyProfile.findOne({
        where: { companyId },
        include: [
          {
            model: Company,
            as: 'company',
            attributes: ['id', 'name']
          }
        ]
      });

      if (!companyProfile) {
        throw new Error(`Company profile not found for company ${companyId}.`);
      }

      return companyProfile;
    } catch (error) {
      logger.error('Failed to fetch company profile', error);
      throw new Error(`Failed to fetch company profile: ${error.message}`);
    }
  },

  async updateCompanyProfile(companyId, data) {
    try {
      const companyProfile = await CompanyProfile.findOne({
        where: { companyId }
      });

      if (!companyProfile) {
        throw new Error(`Company profile not found for company ${companyId}.`);
      }

      await companyProfile.update(data);
      return companyProfile;
    } catch (error) {
      logger.error('Failed to update company profile', error);
      throw new Error(`Failed to update company profile: ${error.message}`);
    }
  }
};

module.exports = companyProfileService;

