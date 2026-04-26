/**
 * View layer for company profile endpoints
 * Handles request parsing, validation, controller calls, and response building
 */
const logger = require('../../logger');
const { MODULE_PERMISSION_CONSTANTS } = require('../constants/permissions');
const companyProfileController = require('../controllers/companyProfileController');
const allowedPermissions = require('../utils/startup/allowedPermissions');
const companyProfileValidator = require('../validators/startup/companyProfileValidator');

/**
 * Get company profile view
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
async function getCompanyProfileView(req, res) {
  try {
    // Extract data from request
    const companyId = req.user.company_id;
    const userId = req.user.id;

    // Permission check
    const requiredPermission = MODULE_PERMISSION_CONSTANTS.VIEW_COMPANY_SETTINGS.name;
    const hasPermission = await allowedPermissions(userId, [requiredPermission]);
    if (!hasPermission) {
      return res.status(403).json({ error: `You are not authorized to access this resource ${requiredPermission}` });
    }

    // Validate (if needed)
    const validation = companyProfileValidator.validateGetCompanyProfile({ companyId });
    if (!validation.isValid) {
      return res.status(400).json({ errors: validation.errors });
    }

    // Call controller
    const companyProfile = await companyProfileController.getCompanyProfile(companyId);

    // Build and send response
    res.json(companyProfile);
  } catch (error) {
    logger.error('Error in getCompanyProfile view', error);
    res.status(400).json({ error: error.message });
  }
}

/**
 * Update company profile view
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
async function updateCompanyProfileView(req, res) {
  try {
    // Extract data from request
    const companyId = req.user.company_id;
    const userId = req.user.id;
    const profileData = req.body;

    // Permission check
    const requiredPermission = MODULE_PERMISSION_CONSTANTS.UPDATE_COMPANY_SETTINGS.name;
    const hasPermission = await allowedPermissions(userId, [requiredPermission]);
    if (!hasPermission) {
      return res.status(403).json({ error: `You are not authorized to access this resource ${requiredPermission}` });
    }

    // Validate
    const validation = companyProfileValidator.validateUpdateCompanyProfile(profileData);
    if (!validation.isValid) {
      return res.status(400).json({ errors: validation.errors });
    }

    // Call controller
    const companyProfile = await companyProfileController.updateCompanyProfile(companyId, profileData);

    // Build and send response
    res.json(companyProfile);
  } catch (error) {
    logger.error('Error in updateCompanyProfile view', error);
    res.status(400).json({ error: error.message });
  }
}

module.exports = {
  getCompanyProfileView,
  updateCompanyProfileView
};

