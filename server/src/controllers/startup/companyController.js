// controllers/companyController.js
const { get: _get } = require('../../routes/startup/authRoutes');
const companyService = require('../../services/startup/companyService');
const allowedPermissions = require('../../utils/startup/allowedPermissions');
const { generateAccessToken, generateRefreshToken } = require('../../utils/startup/authUtils');
const { MODULE_PERMISSION_CONSTANTS } = require('../../constants/permissions');
const env = require('../../config/env');
const { User } = require('../../models');

const companyController = {
  async getCompanySettings(req, res) {
    try {
      const requiredPermission = MODULE_PERMISSION_CONSTANTS.GET_COMPANY_SETTINGS.name;
      const hasPermission = await allowedPermissions(req.user.id, [requiredPermission]);
      if (!hasPermission) {
        return res.status(403).json({ error: `You are not authorized to access this resource ${requiredPermission}` });
      }

      const id = req.user;
      const settings = await companyService.getCompanySettings(id);
      res.json(settings);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  async updateCompanySettings(req, res) {
    try {
      const requiredPermission = MODULE_PERMISSION_CONSTANTS.UPDATE_COMPANY_SETTINGS.name;
      const hasPermission = await allowedPermissions(req.user.id, [requiredPermission]);
      if (!hasPermission) {
        return res.status(403).json({ error: `You are not authorized to access this resource ${requiredPermission}` });
      }

      const id = req.user;
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
      const requiredPermission = MODULE_PERMISSION_CONSTANTS.CREATE_COMPANY.name;
      const hasPermission = await allowedPermissions(req.user.id, [requiredPermission]);
      if (!hasPermission) {
        return res.status(403).json({ error: `You are not authorized to access this resource ${requiredPermission}` });
      }

      const { name, mobileApp, desktopWeb, mobileWeb } = req.body;
      if (!name) {
        return res.status(400).json({ error: 'Name is required' });
      }

      const company = await companyService.createCompanyAndLink({ name, mobileApp, desktopWeb, mobileWeb }, req.user.id);
      return res.status(201).json(company);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  },

  async myCompanies(req, res) {
    try {
      const companies = await companyService.getUserCompanies(req.user.id);
      return res.status(200).json({ companies, activeCompanyId: req.user });
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

      const updatedUser = await companyService.switchUserCompany(req.user.id, companyId);

      // Issue new tokens tied to new companyId
      const accessToken = generateAccessToken(updatedUser);
      const refreshToken = await generateRefreshToken(updatedUser);

      // Persist refresh token and activity
      await User.update(
        { refresh_token: refreshToken, last_active: new Date() },
        { where: { id: updatedUser.id } }
      );

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
  }
};

module.exports = companyController;
