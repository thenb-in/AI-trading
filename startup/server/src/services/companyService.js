// services/companyService.js
const { Company, MultiCompanyModule, User, UserProfile, CompanyProfile } = require('../models');
const { Op: _Op } = require('sequelize');
const logger = require('../../logger');
const { findModelByIdOrThrow } = require('../utils/modelHelpers');
const { v4: uuidv4 } = require('uuid');

const companyService = {
  /**
   * Get a single company by id (UUID). Returns { id, name } or null.
   * @param {string} companyId - Company UUID
   * @returns {Promise<{ id: string, name: string } | null>}
   */
  async getCompanyById(companyId) {
    try {
      const company = await Company.findByPk(companyId, {
        attributes: ['id', 'name']
      });
      return company || null;
    } catch (error) {
      logger.error(`Error fetching company ${companyId}: ${error.message}`, error);
      throw error;
    }
  },

  async getCompanySettings(id) {
    try {
      return await findModelByIdOrThrow(Company, id, {
        attributes: ['id', 'name','mobileApp','desktopWeb','mobileWeb', 'job_offer_header_image', 'job_offer_footer_image', 'job_offer_header_height_cm', 'job_offer_footer_height_cm', 'emp_code_basis', 'latitude', 'longitude', 'consecutive_leave_deactivation_days']
      }, 'Company');
    } catch (error) {
      throw new Error(`Failed to fetch company settings: ${error.message}`);
    }
  },

  async getJobOfferSettings(id) {
    try {
      const company = await Company.findByPk(id, {
        attributes: ['id', 'job_offer_header_image', 'job_offer_footer_image', 'job_offer_header_height_cm', 'job_offer_footer_height_cm']
      });
      if (!company) {
        throw new Error(`Company not found ${id}.`);
      }
      return {
        job_offer_header_image: company.job_offer_header_image || null,
        job_offer_footer_image: company.job_offer_footer_image || null,
        job_offer_header_height_cm: company.job_offer_header_height_cm || 3.0,
        job_offer_footer_height_cm: company.job_offer_footer_height_cm || 3.0
      };
    } catch (error) {
      throw new Error(`Failed to fetch job offer settings: ${error.message}`);
    }
  },

  async updateJobOfferSettings(id, data) {
    logger.info(`Updating job offer settings for company ID: ${id}`);
    try {
      const company = await Company.findByPk(id);
      if (!company) {
        throw new Error(`Company with id ${id} not found.`);
      }
      await company.update({
        job_offer_header_image: data.job_offer_header_image,
        job_offer_footer_image: data.job_offer_footer_image,
        job_offer_header_height_cm: data.job_offer_header_height_cm,
        job_offer_footer_height_cm: data.job_offer_footer_height_cm
      });
      return company;
    } catch (error) {
      throw new Error(`Failed to update job offer settings: ${error.message}`);
    }
  },

  async updateCompanySettings(id, data) {
    logger.info(`Updating company settings for ID: ${id}`);
    logger.silly(`New settings: ${JSON.stringify(data)}`);
    try {
      const company = await findModelByIdOrThrow(Company, id, {}, 'Company');
      const updates = {
        name: data.name,
        mobileApp: data.mobileApp,
        desktopWeb: data.desktopWeb,
        mobileWeb: data.mobileWeb
      };
      if (data.emp_code_basis !== undefined) {
        updates.emp_code_basis = data.emp_code_basis;
      }
      if (data.latitude !== undefined) {
        updates.latitude = data.latitude;
      }
      if (data.longitude !== undefined) {
        updates.longitude = data.longitude;
      }
      if (data.consecutive_leave_deactivation_days !== undefined) {
        updates.consecutive_leave_deactivation_days = data.consecutive_leave_deactivation_days;
      }
      await company.update(updates);
      return company;
    } catch (error) {
      throw new Error(`Failed to update company settings: ${error.message}`);
    }
  },

  async createCompanyAndLink(data, userId) {
    const transaction = await Company.sequelize.transaction();
    try {
      // Determine the company ID to use
      let companyIdToUse;

      if (data.companyId && data.companyId.trim() !== '') {
        // Use provided companyId after trimming
        companyIdToUse = data.companyId.trim();

        // Check if companyId already exists
        const existingCompany = await Company.findOne({
          where: { id: companyIdToUse },
          transaction
        });
        if (existingCompany) {
          throw new Error(`Company ID "${companyIdToUse}" is already taken. Please choose a different ID.`);
        }
      } else {
        // Generate a random UUID if companyId is not provided
        companyIdToUse = uuidv4();
        logger.info(`Generated UUID for company: ${companyIdToUse}`);
      }

      const company = await Company.create(
        {
          name: data.name,
          id: companyIdToUse,
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

    user.company_id = companyId;
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

  },

  async getActiveCompanyForUser  (user)  {
    const profile = await UserProfile.findOne({ where: { userId: user.id } });
    const activeCompanyId = profile?.currentCompany || user.company_id;
    if (!activeCompanyId) {
      return null;
    }
    return await Company.findByPk(activeCompanyId, { attributes: ['id', 'name','latitude','longitude'] });
  }

};

module.exports = companyService;
