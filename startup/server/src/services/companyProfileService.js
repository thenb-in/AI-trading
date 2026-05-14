const { CompanyProfile, Company } = require('../models');
const logger = require('../../logger');

const companyProfileService = {
  async getCompanyProfile(companyId) {
    try {
      let companyProfile = await CompanyProfile.findOne({
        where: { companyId },
        include: [
          {
            model: Company,
            as: 'company'
            // attributes: ['id', 'name']
          }
        ]
      });

      if (!companyProfile) {
        companyProfile = await CompanyProfile.create({
          companyId
        });
        await companyProfile.reload({
          include: [
            {
              model: Company,
              as: 'company',
              attributes: ['id', 'name']
            }
          ]
        });
      }

      return companyProfile;
    } catch (error) {
      logger.error('Failed to fetch company profile', error);
      throw new Error(`Failed to fetch company profile: ${error.message}`);
    }
  },

  async updateCompanyProfile(companyId, data) {
    try {
      let companyProfile = await CompanyProfile.findOne({
        where: { companyId }
      });

      if (!companyProfile) {
        companyProfile = await CompanyProfile.create({
          companyId,
          ...data
        });
      } else {
        await companyProfile.update(data);
      }

      return companyProfile;
    } catch (error) {
      logger.error('Failed to update company profile', error);
      throw new Error(`Failed to update company profile: ${error.message}`);
    }
  }
};

module.exports = companyProfileService;

