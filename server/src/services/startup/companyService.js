// services/companyService.js
const { Company, MultiCompanyModule, User } = require('../../models');
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

  async createCompanyAndLink(data, userId) {
    const transaction = await Company.sequelize.transaction();
    try {
      const company = await Company.create(
        {
          name: data.name,
          mobileApp: !!data.mobileApp,
          desktopWeb: data.desktopWeb === undefined ? true : !!data.desktopWeb,
          mobileWeb: !!data.mobileWeb
        },
        { transaction }
      );

      await MultiCompanyModule.create(
        { userId, companyId: company.id },
        { transaction }
      );

      await transaction.commit();
      return company;
    } catch (error) {
      if (!transaction.finished) {
        await transaction.rollback();
      }
      throw new Error(`Failed to create company: ${error.message}`);
    }
  },

  async getUserCompanies(userId) {
    const links = await MultiCompanyModule.findAll({
      where: { userId },
      include: [{ model: Company, as: 'company', attributes: ['id', 'name'] }],
      order: [['createdAt', 'ASC']]
    });
    return links.map(link => link.company).filter(Boolean);
  },

  async switchUserCompany(userId, companyId) {
    // Ensure the user is linked to the company
    const link = await MultiCompanyModule.findOne({ where: { userId, companyId } });
    if (!link) {
      throw new Error('You are not linked to this company');
    }

    const company = await Company.findByPk(companyId);
    if (!company) {
      throw new Error('Company not found');
    }

    const user = await User.findByPk(userId);
    if (!user || !user.isActive) {
      throw new Error('Invalid or inactive user');
    }

    user.companyId = companyId;
    // Inherit device access flags from company when switching
    user.mobileApp = company.mobileApp;
    user.desktopWeb = company.desktopWeb;
    user.mobileWeb = company.mobileWeb;
    // await user.save();
    return {
      ...user.toJSON(),
      company: {
        id: company.id,
        name: company.name
      }
    };

  }
};

module.exports = companyService;
