// services/companyService.js
const { Op: _Op } = require('sequelize');
const logger = require('../../../logger');
// Company is the primary model for this service
const { Company } = require('../../models');
const { findModelByIdOrThrow } = require('../../utils/startup/modelHelpers');

const companyService = {
  /**
   * Creates a new company record in the database.
   * @param {Object} data - Company fields (name, mobileApp, desktopWeb, mobileWeb, optionally id)
   * @param {Object|null} transaction - Optional Sequelize transaction
   * @returns {Promise<Object>} Created Company model instance
   */
  async createCompany(data, transaction = null) {
    const options = transaction ? { transaction } : {};
    return await Company.create(data, options);
  },

  /**
   * Updates a company's settings (name, device access policies).
   * @param {string} id - Company ID
   * @param {Object} data - Fields to update (name, mobileApp, desktopWeb, mobileWeb)
   * @returns {Promise<Object>} Updated Company model instance
   * @throws {Error} If company not found or update fails
   */
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

  /**
   * Retrieves a company's settings by ID. Throws if not found.
   * @param {string} id - Company ID
   * @param {Object} options - Additional Sequelize find options
   * @returns {Promise<Object>} Company model instance with id, name, and device access fields
   * @throws {Error} If company not found
   */
  async getCompanySettings(id, options = {}) {
    return await findModelByIdOrThrow(Company, id, {
      attributes: ['id', 'name','mobileApp','desktopWeb','mobileWeb'],
      ...options
    }, 'Company');
  },

  /**
   * Retrieves all companies ordered alphabetically by name.
   * @returns {Promise<Array<{ id: string, name: string }>>} List of companies
   * @throws {Error} If query fails
   */
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
  },
  /**
   * Checks if a company with the given ID exists.
   * @param {string} company_id - Company ID to check
   * @param {Object} transaction - Sequelize transaction
   * @returns {Promise<Object|null>} Company instance or null
   */
  async  existingCompany (company_id,transaction){
    return  await Company.findOne({
      where: { id: company_id },
      transaction});
  }
};

module.exports = companyService;
