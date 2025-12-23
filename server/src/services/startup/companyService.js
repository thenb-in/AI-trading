// services/companyService.js
const { Company, MultiCompanyModule, User, UserProfile, CompanyProfile } = require('../../models');
const { Op: _Op } = require('sequelize');
const logger = require('../../../logger');
const { findModelByIdOrThrow } = require('../../utils/startup/modelHelpers');

const companyService = {
  async getCompanySettings(id) {
    try {
      return await findModelByIdOrThrow(Company, id, {
        attributes: ['id', 'name','mobileApp','desktopWeb','mobileWeb']
      }, 'Company');
    } catch (error) {
      throw new Error(`Failed to fetch company settings: ${error.message}`);
    }
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

  async createCompanyAndLink(data, userId) {
    const transaction = await Company.sequelize.transaction();
    try {
      // Check if companyId already exists
      if (data.companyId) {
        const existingCompany = await Company.findOne({
          where: { id: data.companyId },
          transaction
        });
        if (existingCompany) {
          throw new Error(`Company ID "${data.companyId}" is already taken. Please choose a different ID.`);
        }
      }

      const company = await Company.create(
        {
          name: data.name,
          id: data.companyId,
          mobileApp: !!data.mobileApp,
          desktopWeb: data.desktopWeb === undefined ? true : !!data.desktopWeb,
          mobileWeb: !!data.mobileWeb
        },
        { transaction }
      );

      await CompanyProfile.create(
        {
          companyId: company.id
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
      throw new Error(`You are not linked to this company ${companyId}.`);
    }

    const company = await findModelByIdOrThrow(Company, companyId, {}, 'Company');
    const user = await findModelByIdOrThrow(User, userId, {}, 'User');

    if (!user.isActive) {
      throw new Error(`Invalid or inactive user ${userId}.`);
    }

    user.companyId = companyId;
    // Inherit device access flags from company when switching
    user.mobileApp = company.mobileApp;
    user.desktopWeb = company.desktopWeb;
    user.mobileWeb = company.mobileWeb;
    // await user.save();
    await UserProfile.update(
      { currentCompany: companyId },
      { where: { userId } }
    );
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
