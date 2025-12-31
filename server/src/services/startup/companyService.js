// services/companyService.js
const { Op: _Op } = require('sequelize');
const logger = require('../../../logger');
// Company is the primary model for this service
const { Company } = require('../../models');
const { findModelByIdOrThrow } = require('../../utils/startup/modelHelpers');

const companyService = {
  async createCompany(data, transaction = null) {
    const options = transaction ? { transaction } : {};
    return await Company.create(data, options);
  },

  async updateCompanySettings(id, data) {
    logger.info(`Updating company settings for ID: ${id}`);
    logger.silly(`New settings: ${JSON.stringify(data)}`);
    try {
      const company = await findModelByIdOrThrow(Company, id, {}, 'Company');
      await company.update({

        name: data.name,

        mobileApp: data.mobileApp,
        desktopWeb: data.desktopWeb,
        mobileWeb: data.mobileWeb
      });
      return company;
    } catch (error) {
      throw new Error(`Failed to update company settings: ${error.message}`);
    }
  },

  async getCompanySettings(id, options = {}) {
    return await findModelByIdOrThrow(Company, id, {
      attributes: ['id', 'name','mobileApp','desktopWeb','mobileWeb'],
      ...options
    }, 'Company');
  },

  async getAllCompanies() {
    try {
      const companies = await Company.findAll({
        attributes: ['id', 'name'],
        order: [['name', 'ASC']]
      });
      return companies;
    } catch (error) {
      logger.error('Error fetching companies', error);
      throw new Error(`Failed to fetch companies at  ${new Date()}`);
    }
  }
};

module.exports = companyService;
