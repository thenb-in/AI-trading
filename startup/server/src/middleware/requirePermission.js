const logger = require('../../logger');
const { HTTP_STATUS_FORBIDDEN, HTTP_STATUS_INTERNAL_ERROR } = require('../constants/http');
const allowedPermissions = require('../utils/allowedPermissions');
const { sendError } = require('../utils/response');

function requirePermission(permissionName) {
  const permissionList = Array.isArray(permissionName) ? permissionName : [permissionName];
  return async function requirePermissionMiddleware(req, res, next) {
    try {
      const hasPermission = await allowedPermissions(req.user.id, permissionList);
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


