const companyProfileService = require('../services/companyProfileService');
const allowedPermissions = require('../utils/startup/allowedPermissions');
const { MODULE_PERMISSION_CONSTANTS } = require('../constants/permissions');

const companyProfileController = {
  async getCompanyProfile(req, res) {
    try {
      const requiredPermission = MODULE_PERMISSION_CONSTANTS.GET_COMPANY_SETTINGS.name;
      const hasPermission = await allowedPermissions(req.user.id, [requiredPermission]);
      if (!hasPermission) {
        return res.status(403).json({ error: `You are not authorized to access this resource ${requiredPermission}` });
      }

      const companyId = req.user.company_id;
      const companyProfile = await companyProfileService.getCompanyProfile(companyId);
      res.json(companyProfile);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  async updateCompanyProfile(req, res) {
    try {
      const requiredPermission = MODULE_PERMISSION_CONSTANTS.UPDATE_COMPANY_SETTINGS.name;
      const hasPermission = await allowedPermissions(req.user.id, [requiredPermission]);
      if (!hasPermission) {
        return res.status(403).json({ error: `You are not authorized to access this resource ${requiredPermission}` });
      }

      const companyId = req.user.company_id;
      const companyProfile = await companyProfileService.updateCompanyProfile(companyId, req.body);
      res.json(companyProfile);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
};

module.exports = companyProfileController;

