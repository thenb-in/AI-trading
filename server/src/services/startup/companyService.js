// services/companyService.js
const { Company, User, Room, Message: _Message } = require('../../models');
const { Op: _Op } = require('sequelize');
const logger = require('../../../logger');

const companyService = {
  async getCompanySettings(id) {
    try {
      const company = await Company.findByPk(id, {
        attributes: ['id', 'name','mobileApp','desktopWeb','mobileWeb']
      });
      if (!company) {
        throw new Error('Company not found');
      }
      return company;
    } catch (error) {
      throw new Error(`Failed to fetch company settings: ${error.message}`);
    }
  },

  async updateCompanySettings(id, data) {
    logger.info(`Updating company settings for ID: ${id}`);
    logger.silly(`New settings: ${JSON.stringify(data)}`);
    try {
      const company = await Company.findByPk(id);
      if (!company) {
        throw new Error(`Company with id ${id} not found`);
      }
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

  async createCompany(data) {
    try {
      const { name, messageTimer: _messageTimer = null, hideChat: _hideChat = false, deleteOnSeen: _deleteOnSeen=false } = data;
      const company = await Company.create({
        name
      });
      return company;
    } catch (error) {
      throw new Error(`Failed to create company: ${error.message}`);
    }
  },

  async getCompanies() {
    try {
      const companies = await Company.findAll({
        include: [
          { model: User, as: 'users', attributes: ['id', 'name', 'role', 'isActive'] },
          { model: Room, as: 'rooms', attributes: ['id', 'name'] }
        ]
      });
      return companies;
    } catch (error) {
      throw new Error(`Failed to fetch companies: ${error.message}`);
    }
  },

  async getCompany(id) {
    try {
      const company = await Company.findByPk(id, {
        include: [
          { model: User, as: 'users', attributes: ['id', 'name', 'role', 'isActive'] },
          { model: Room, as: 'rooms', attributes: ['id', 'name'] }
        ]
      });
      if (!company) {
        throw new Error(`Company with id ${id} not found`);
      }
      return company;
    } catch (error) {
      throw new Error(`Failed to fetch company: ${error.message}`);
    }
  },

  async deleteCompany(id) {
    try {
      const company = await Company.findByPk(id);
      if (!company) {
        throw new Error(`Company with id ${id} not found`);
      }
      await company.destroy();
      return { message: 'Company deleted successfully' };
    } catch (error) {
      throw new Error(`Failed to delete company: ${error.message}`);
    }
  }
};

module.exports = companyService;
