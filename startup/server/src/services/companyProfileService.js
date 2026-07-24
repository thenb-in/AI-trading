const { CompanyProfile } = require('../models');

const companyProfileService = {

  async getCompanyProfile(companyId) {
    return CompanyProfile.findOne({ where: { companyId } });
  },

  async createCompanyProfile(data, transaction = null) {
    return CompanyProfile.create(data, { transaction });
  }
};

module.exports = companyProfileService;
