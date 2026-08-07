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

  async getCompanyByName(name, transaction) {
    return Company.findOne({ where: { name }, transaction });
  },

  async getAllCompanies() {
    return Company.findAll({
      attributes: ['id', 'name'],
      order: [['name', 'ASC']]
    });
  },


  async createCompany(data, transaction) {
    return Company.create(
      {
        id: data.id && data.id.trim() ? data.id.trim() : uuidv4(),
        name: data.name,
        mobileApp: !!data.mobileApp,
        desktopWeb: data.desktopWeb === undefined ? true : !!data.desktopWeb,
        mobileWeb: !!data.mobileWeb,
        role_id: data.role_id ?? null
      },
      { transaction }
    );
  },

  async getCompanySettings(id) {
    try {
      const company = await findModelByIdOrThrow(Company, id, {
        attributes: ['id', 'name', 'mobileApp', 'desktopWeb', 'mobileWeb', 'latitude', 'longitude', 'geofence_radius_meters'],
        include: [{ model: CompanyProfile, as: 'companyProfile', attributes: ['debug_mode_shortcut'], required: false }]
      }, 'Company');
      return {
        ...company.get({ plain: true }),
        debug_mode_shortcut: company.companyProfile?.debug_mode_shortcut ?? null
      };
    } catch (error) {
      throw new Error(`Failed to fetch company settings: ${error.message}`);
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
      if (data.latitude !== undefined) {
        updates.latitude = data.latitude;
      }
      if (data.longitude !== undefined) {
        updates.longitude = data.longitude;
      }
      if (data.geofence_radius_meters !== undefined) {
        updates.geofence_radius_meters = data.geofence_radius_meters;
      }
      await company.update(updates);

      if (data.debug_mode_shortcut !== undefined) {
        const [profile] = await CompanyProfile.findOrCreate({ where: { companyId: id }, defaults: { companyId: id } });
        await profile.update({ debug_mode_shortcut: data.debug_mode_shortcut });
      }
      return company;
    } catch (error) {
      throw new Error(`Failed to update company settings: ${error.message}`);
    }
  },

  /**
   * The profile row that belongs to a company someone else just created. Split
   * out for callers that own their own transaction (onboarding creates the
   * company, the profile, the subscription and the first user in one), so they
   * do not have to reach past the services layer for the model.
   */
  async createCompanyProfile(data, transaction) {
    return CompanyProfile.create(data, { transaction });
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
    const [profile, created] = await UserProfile.findOrCreate({
      where: { userId },
      defaults: { userId, currentCompany: companyId }
    });
    if (!created) {
      profile.currentCompany = companyId;
      await profile.save();
    }
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
    return await Company.findByPk(activeCompanyId, { attributes: ['id', 'name','latitude','longitude','geofence_radius_meters'] });
  }

};

module.exports = companyService;
