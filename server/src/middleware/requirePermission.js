const logger = require('../../logger');
const { HTTP_STATUS_FORBIDDEN, HTTP_STATUS_INTERNAL_ERROR } = require('../constants/startup/http');
const allowedPermissions = require('../utils/startup/allowedPermissions');
const { sendError } = require('../utils/startup/response');


function requirePermission(permissionName) {
  return async function requirePermissionMiddleware(req, res, next) {
    try {
      const hasPermission = await allowedPermissions(req.user.id, [permissionName]);
      if (!hasPermission) {
        return sendError(res, {
          statusCode: HTTP_STATUS_FORBIDDEN,
          message: `You are not authorized. Missing permission: ${permissionName}`
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


