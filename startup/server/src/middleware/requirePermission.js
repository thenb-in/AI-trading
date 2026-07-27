const logger = require('../../logger');
const { HTTP_STATUS_FORBIDDEN, HTTP_STATUS_INTERNAL_ERROR } = require('../constants/http');
const licenseService = require('../license/licenseService');
const allowedPermissions = require('../utils/allowedPermissions');
const { sendError } = require('../utils/response');

/**
 * Factory function that creates Express middleware to check if the authenticated user
 * has a specific named permission. Must be used after the auth protect middleware.
 */
function requirePermission(permissionName) {
  const permissionList = Array.isArray(permissionName) ? permissionName : [permissionName];
  return async function requirePermissionMiddleware(req, res, next) {
    try {
      if (req.user?.ssoManaged) {
        return next();
      }
      // Load the license whitelist once (null = licensing bypassed → allow all).
      const licensedNames = await licenseService.getLicensedPermissions();
      const licensedPermissions = licensedNames === null
        ? permissionList
        : permissionList.filter((perm) => licensedNames.includes(perm));
      if (licensedPermissions.length === 0) {
        return sendError(res, {
          statusCode: HTTP_STATUS_FORBIDDEN,
          message: `License does not authorize: ${permissionList.join(' or ')}`
        });
      }
      const hasPermission = await allowedPermissions(req.user.id, licensedPermissions);
      if (!hasPermission) {
        return sendError(res, {
          statusCode: HTTP_STATUS_FORBIDDEN,
          message: `You are not authorized. Missing permission: ${permissionList.join(' or ')}`
        });
      }
      return next();
    } catch (error) {
      logger.error(`Error checking permissions. ${error.message}`, error);
      return sendError(res, {
        statusCode: HTTP_STATUS_INTERNAL_ERROR,
        message: `Failed to validate permissions. ${error.message}`
      });
    }
  };
}

module.exports = requirePermission;
