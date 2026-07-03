const env = require('../config/env');
const { MASTER_PERMISSION_CONSTANTS, MODULE_PERMISSION_CONSTANTS } = require('../constants/base_permissions');
const companyService = require('../services/companyService');
const userService = require('../services/userService');
const allowedPermissions = require('../utils/allowedPermissions');
const { generateAccessToken, generateRefreshToken } = require('../utils/authUtils');
const { normalizeCoordinate, normalizeRadiusMeters } = require('../utils/locationUtils');

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
      const { deleteOnSeen, messageTimer, name, hideChat, mobileApp, desktopWeb, mobileWeb, latitude, longitude, geofence_radius_meters } = req.body;

      // Normalize lat/long (empty => null/cleared, else range-checked) and the
      // geofence radius (blank => unchanged, else a positive whole number).
      let latitudeValue, longitudeValue, geofenceRadiusValue;
      try {
        latitudeValue = normalizeCoordinate(latitude, -90, 90, 'latitude');
        longitudeValue = normalizeCoordinate(longitude, -180, 180, 'longitude');
        geofenceRadiusValue = normalizeRadiusMeters(geofence_radius_meters);
      } catch (validationError) {
        return res.status(400).json({ error: validationError.message });
      }

      const settings = await companyService.updateCompanySettings(id, {
        deleteOnSeen,
        messageTimer,
        hideChat,
        mobileApp,
        desktopWeb,
        mobileWeb,
        name,
        latitude: latitudeValue,
        longitude: longitudeValue,
        geofence_radius_meters: geofenceRadiusValue
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

      // Validate companyId format if provided
      if (companyId !== undefined && companyId !== null && companyId !== '') {
        const trimmedCompanyId = companyId.trim();
        if (trimmedCompanyId.length < 2) {
          return res.status(400).json({ error: 'Company ID must be at least 2 characters (letters, numbers, underscores, hyphens only).' });
        }
        // Validate format: only letters, numbers, underscores, hyphens
        const companyIdPattern = /^[a-zA-Z0-9_-]+$/;
        if (!companyIdPattern.test(trimmedCompanyId)) {
          return res.status(400).json({ error: 'Company ID must contain only letters, numbers, underscores, and hyphens.' });
        }
      }

      const company = await companyService.createCompanyAndLink({ name, companyId, mobileApp, desktopWeb, mobileWeb }, req.user.id);
      return res.status(201).json({
        message: `Company "${company.name}" created successfully with ID "${company.id}"!`,
        company
      });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  },

  async myCompanies(req, res) {
    try {
      const companies = await companyService.getUserCompanies(req.user.id);
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

      const updatedUser = await companyService.switchUserCompany(req.user.id, companyId);

      // Issue new tokens tied to new companyId
      const accessToken = await generateAccessToken(updatedUser);
      const refreshToken = await generateRefreshToken(updatedUser);

      // Persist refresh token and activity
      await userService.updateUserRefreshTokenAndLastActive(updatedUser.id, refreshToken);

      res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: env.isSecureCookie,
        sameSite: 'strict',
        maxAge: env.MAX_JWT_ACCESS_EXPIRATION_MS
      });
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: env.isSecureCookie,
        sameSite: 'strict',
        maxAge: env.MAX_JWT_REFRESH_EXPIRATION_MS
      });
      res.cookie('isLoggedIn', 'true', {
        secure: env.isSecureCookie,
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
