// controllers/companyController.js
const env = require('../../config/env');
const { MASTER_PERMISSION_CONSTANTS ,MODULE_PERMISSION_CONSTANTS} = require('../../constants/permissions');
const { get: _get } = require('../../routes/startup/authRoutes');
const companyService = require('../../services/startup/companyService');
const multiCompanyService = require('../../services/startup/multiCompanyService');
const userService = require('../../services/startup/userService');
const allowedPermissions = require('../../utils/startup/allowedPermissions');
const { generateAccessToken, generateRefreshToken } = require('../../utils/startup/authUtils');

const companyController = {
  async getCompanySettings(req, res) {
    try {
      const requiredPermission = MODULE_PERMISSION_CONSTANTS.VIEW_COMPANY_SETTINGS.name;
      const hasPermission = await allowedPermissions(req.user.id, [requiredPermission]);
      if (!hasPermission) {
        return res.status(403).json({ error: `You are not authorized to access this resource ${requiredPermission}` });
      }

      const id = req.user.company_id;
      const settings = await companyService.getCompanySettings(id);
      res.json(settings);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  async updateCompanySettings(req, res) {
    try {
      const requiredPermission = MASTER_PERMISSION_CONSTANTS.COMPANY.update.name;
      const hasPermission = await allowedPermissions(req.user.id, [requiredPermission]);
      if (!hasPermission) {
        return res.status(403).json({ error: `You are not authorized to access this resource ${requiredPermission}` });
      }

      const id = req.user.company_id;
      const { deleteOnSeen , messageTimer, name, hideChat,  mobileApp, desktopWeb, mobileWeb } = req.body;

      const settings = await companyService.updateCompanySettings(id, {
        deleteOnSeen,
        messageTimer,
        hideChat,
        mobileApp,
        desktopWeb,
        mobileWeb,
        name
      });

      res.json(settings);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  async createCompany(req, res) {
    try {
      const requiredPermission = MASTER_PERMISSION_CONSTANTS.COMPANY.create.name;
      const hasPermission = await allowedPermissions(req.user.id, [requiredPermission]);
      if (!hasPermission) {
        return res.status(403).json({ error: `You are not authorized to access this resource ${requiredPermission}` });
      }

      const { name, companyId, mobileApp, desktopWeb, mobileWeb } = req.body;
      if (!name) {
        return res.status(400).json({ error: `Company name is required get ${name}` });
      }
      if (!companyId) {
        return res.status(400).json({ error: `Company ID is required get ${companyId}` });
      }
      const company = await multiCompanyService.createCompanyAndLink({ name, companyId, mobileApp, desktopWeb, mobileWeb }, req.user.id);
      return res.status(201).json({
        message: `Company "${company.name}" created successfully with ID "${companyId}"!`,
        company
      });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  },

  async myCompanies(req, res) {
    try {
      const companies = await multiCompanyService.getUserCompanies(req.user.id);
      return res.status(200).json({ companies, activeCompanyId: req.user.company_id });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  },

  async switchCompany(req, res) {
    try {
      const { companyId } = req.body || {};
      if (!companyId) {
        return res.status(400).json({ error: `companyId is required ${companyId}.` });
      }

      const updatedUser = await multiCompanyService.switchUserCompany(req.user.id, companyId);

      // Issue new tokens tied to new companyId
      const accessToken = generateAccessToken(updatedUser);
      const refreshToken = await generateRefreshToken(updatedUser);

      // Persist refresh token and activity
      await userService.updateUserRefreshTokenAndLastActive(updatedUser.id, refreshToken);

      res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: env.isProduction,
        sameSite: 'strict',
        maxAge: env.MAX_JWT_ACCESS_EXPIRATION_MS
      });
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: env.isProduction,
        sameSite: 'strict',
        maxAge: env.MAX_JWT_REFRESH_EXPIRATION_MS
      });
      res.cookie('isLoggedIn', 'true', {
        secure: env.isProduction,
        sameSite: 'strict',
        maxAge: env.MAX_JWT_REFRESH_EXPIRATION_MS
      });

      return res.status(200).json({ updatedUser, message: `Company switched successfully to ${companyId}` });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  },

  async createInitialCompany(req, res) {
    try {
      // This endpoint is for users without a company to create their first company
      // No permission check needed since user has no company
      const { name, mobileApp, desktopWeb, mobileWeb } = req.body;
      if (!name || !name.trim()) {
        return res.status(400).json({ error: `Company name is required get ${name}` });
      }
      // Check if user already has a company
      if (req.user.company_id) {
        return res.status(400).json({ error: `User with id : ${req.user.id} already has a company assigned ` });
      }
      const company = await multiCompanyService.createCompanyAndLink(
        {
          name: name.trim(),
          companyId: null, // Auto-generate UUID
          mobileApp: !!mobileApp,
          desktopWeb: desktopWeb === undefined ? true : !!desktopWeb,
          mobileWeb: !!mobileWeb
        },
        req.user.id
      );

      // Update user's company_id using service
      const updatedUser = await userService.updateUserCurrentCompany(req.user.id, company.id);
      const accessToken = generateAccessToken(updatedUser);
      const refreshToken = await generateRefreshToken(updatedUser);

      // Persist refresh token
      await userService.updateUserRefreshTokenAndLastActive(updatedUser.id, refreshToken);

      res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: env.isProduction,
        sameSite: 'strict',
        maxAge: env.MAX_JWT_ACCESS_EXPIRATION_MS
      });
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: env.isProduction,
        sameSite: 'strict',
        maxAge: env.MAX_JWT_REFRESH_EXPIRATION_MS
      });
      res.cookie('isLoggedIn', 'true', {
        secure: env.isProduction,
        sameSite: 'strict',
        maxAge: env.MAX_JWT_REFRESH_EXPIRATION_MS
      });

      return res.status(201).json({
        message: `Company "${company.name}" created successfully!`,
        company,
        user: {
          id: updatedUser.id,
          company_id: updatedUser.company_id
        }
      });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  },

  async joinCompany(req, res) {
    try {
      const { companyId } = req.body;
      if (!companyId) {
        return res.status(400).json({ error: `Company ID is required get ${companyId}` });
      }

      // Check if company exists
      const company = await companyService.getCompanySettings(companyId);
      if (!company) {
        return res.status(404).json({ error: 'Company not found' });
      }

      // Check if user is already linked to this company
      const existingLink = await multiCompanyService.findUserCompanyLink(req.user.id, companyId);

      // If not linked, assign user to company
      if (!existingLink) {
        await multiCompanyService.assignUserToCompany(req.user.id, companyId);
      }

      // Switch user to this company
      const updatedUser = await multiCompanyService.switchUserCompany(req.user.id, companyId);

      // Issue new tokens tied to new companyId
      const accessToken = generateAccessToken(updatedUser);
      const refreshToken = await generateRefreshToken(updatedUser);

      // Persist refresh token
      await userService.updateUserRefreshTokenAndLastActive(updatedUser.id, refreshToken);

      res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: env.isProduction,
        sameSite: 'strict',
        maxAge: env.MAX_JWT_ACCESS_EXPIRATION_MS
      });
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: env.isProduction,
        sameSite: 'strict',
        maxAge: env.MAX_JWT_REFRESH_EXPIRATION_MS
      });
      res.cookie('isLoggedIn', 'true', {
        secure: env.isProduction,
        sameSite: 'strict',
        maxAge: env.MAX_JWT_REFRESH_EXPIRATION_MS
      });

      return res.status(200).json({
        updatedUser,
        message: `Successfully joined company "${company.name}"`
      });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }
};

module.exports = companyController;
