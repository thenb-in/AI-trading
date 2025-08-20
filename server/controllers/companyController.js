// controllers/companyController.js
const { get } = require('../routes/authRoutes');
const companyService = require('../services/companyService');
const allowedPermissions = require('../utils/allowedPermissions');

const companyController = {
  async getCompanySettings(req, res) {
    try {
      let requiredPermission = 'Get Company Settings'
      const hasPermission = await allowedPermissions(req.user.id, [requiredPermission]);
      if (!hasPermission) {
        return res.status(403).json({ error: "You are not authorized to access this resource " + requiredPermission });
      }

      const id = req.user.companyId;
      const settings = await companyService.getCompanySettings(id);
      res.json(settings);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  async updateCompanySettings(req, res) {
    try {
      let requiredPermission = 'Update Company Settings'
      const hasPermission = await allowedPermissions(req.user.id, [requiredPermission]);
      if (!hasPermission) {
        return res.status(403).json({ error: "You are not authorized to access this resource " + requiredPermission });
      }
      
      const id = req.user.companyId;
      const { deleteOnSeen , messageTimer, name, hideChat,  mobileApp, desktopWeb, mobileWeb } = req.body;

      const settings = await companyService.updateCompanySettings(id, {
        deleteOnSeen,
        messageTimer,
        hideChat,
        mobileApp,
        desktopWeb,
        mobileWeb,
        name,
      });
      
      res.json(settings);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
};

module.exports = companyController;