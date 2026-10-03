const crypto = require('crypto');
const env = require('../config/env');
const companyService = require('../services/companyService');
const sessionService = require('../services/auth/sessionService');
const { generateAccessToken, generateRefreshToken } = require('../utils/authUtils');
const { normalizeCoordinate, normalizeRadiusMeters } = require('../utils/locationUtils');

const companyController = {

  async companyExists(req, res) {
    try {
      const company = await companyService.getCompanyById(req.params.companyId);
      if (!company) {
        return res.json({ exists: false });
      }
      return res.json({ exists: true, company: { id: company.id, name: company.name } });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  },

  async getCompanySettings(req, res) {
    try {
      const id = req.user.company_id;
      const settings = await companyService.getCompanySettings(id);
      res.json(settings);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  async updateCompanySettings(req, res) {
    try {
      const id = req.user.company_id;
      const {
        deleteOnSeen, messageTimer, name, hideChat, mobileApp, desktopWeb, mobileWeb,
        latitude, longitude, geofence_radius_meters, debug_mode_shortcut
      } = req.body;

      // Normalize lat/long (empty => null/cleared, else range-checked) and the
      // geofence radius (blank => unchanged, else a positive whole number). The debug
      // shortcut's format is validated on the model.
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
        geofence_radius_meters: geofenceRadiusValue,
        debug_mode_shortcut
      });

      res.json(settings);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  async createCompany(req, res) {
    try {
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

      const { company, created } = await companyService.createCompanyAndLink({ name, companyId, mobileApp, desktopWeb, mobileWeb }, req.user.id);
      return res.status(created ? 201 : 200).json({
        message: created
          ? `Company "${company.name}" created successfully with ID "${company.id}"!`
          : `Company "${company.name}" with ID "${company.id}" already exists — you have been assigned to it.`,
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
      const sid = req.user?.sid || crypto.randomUUID();
      const accessToken = await generateAccessToken(updatedUser, sid);
      const refreshToken = await generateRefreshToken(updatedUser, sid);
      await sessionService.reissueSessionToken({
        id: sid,
        userId: updatedUser.id,
        refreshToken,
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });

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
