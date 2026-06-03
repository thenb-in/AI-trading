// controllers/companyController.js
const logger = require('@startup/logger');
const env = require('@startup/src/config/env');
const { MASTER_PERMISSION_CONSTANTS, MODULE_PERMISSION_CONSTANTS } = require('@startup/src/constants/base_permissions');
const companyService = require('@startup/src/services/companyService');
const userService = require('@startup/src/services/userService');
const allowedPermissions = require('@startup/src/utils/allowedPermissions');
const { generateAccessToken, generateRefreshToken } = require('@startup/src/utils/authUtils');
const { getBiometricInterface } = require('@biometric');
const { EMPLOYEE_SRC } = require('../constants/hr/employee');
const { normalizeCoordinate } = require('../utils/locationUtils');

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
      const { deleteOnSeen , messageTimer, name, hideChat,  mobileApp, desktopWeb, mobileWeb, emp_code_basis, latitude, longitude } = req.body;

      if (emp_code_basis !== undefined && !['identity_card', 'serial_number'].includes(emp_code_basis)) {
        return res.status(400).json({ error: `Invalid emp_code_basis: ${emp_code_basis}. Must be 'identity_card' or 'serial_number'.` });
      }

      // Normalize lat/long: treat empty string as null (cleared), else validate range.
      let latitudeValue, longitudeValue;
      try {
        latitudeValue = normalizeCoordinate(latitude, -90, 90, 'latitude');
        longitudeValue = normalizeCoordinate(longitude, -180, 180, 'longitude');
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
        emp_code_basis,
        latitude: latitudeValue,
        longitude: longitudeValue
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
      const accessToken = await  generateAccessToken(updatedUser);
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
  },

  /**
   * GET /company/terminal-list-api
   * Calls EasyWDMS GET /iclock/api/terminals/ and returns the same shape as terminal_list_action.get_terminal_list.
   */
  async getTerminalListApi(req, res) {
    try {
      const requiredPermission = MODULE_PERMISSION_CONSTANTS.VIEW_COMPANY_SETTINGS.name;
      const hasPermission = await allowedPermissions(req.user.id, [requiredPermission]);
      if (!hasPermission) {
        return res.status(403).json({ error: `You are not authorized to access this resource (${requiredPermission})` });
      }

      const company_id = req.user.company_id;
      if (!company_id) {
        return res.status(400).json({ error: 'No company context' });
      }

      const iface = getBiometricInterface(EMPLOYEE_SRC.EASYWDMS);
      const result = await iface.getTerminalList(company_id);

      return res.json(result);
    } catch (error) {
      logger.error(`getTerminalListApi failed: ${error.message}`, error);
      const status = error.response?.status;
      const message = error.response?.data?.detail ?? error.message;
      return res.status(status && status >= 400 ? status : 500).json({ error: message });
    }
  }
};

module.exports = companyController;
