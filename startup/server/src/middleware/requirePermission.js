const logger = require('../../logger');
const { HTTP_STATUS_FORBIDDEN, HTTP_STATUS_INTERNAL_ERROR } = require('../constants/http');
const licenseService = require('../license/licenseService');
const allowedPermissions = require('../utils/allowedPermissions');
const { sendError } = require('../utils/response');


/**
 * Factory function that creates Express middleware to check if the authenticated user
 * has a specific named permission. Must be used after the auth protect middleware.
 *
 * Layered check (user choice: whitelist mode):
 *   1. User's role must grant the permission (existing DB-driven check).
 *   2. The active license must whitelist the permission. License is the
 *      UPPER BOUND — even if a role grants P, if the license doesn't
 *      include P (or "*"), P is denied. This guarantees "even if backend
 *      DB gives permission, license blocks are intact".
 *
 * If licensing is bypassed (dev mode with LICENSE_ENFORCEMENT=false),
 * step 2 is a no-op and we behave exactly as before.
 *
 * @param {string} permissionName - Required permission name (e.g., "User.delete")
 * @returns {Function} Express middleware that sends 403 if permission is missing
 */
function requirePermission(permissionName) {
  return async function requirePermissionMiddleware(req, res, next) {
    try {
      const licenseAllowed = licenseService.hasLicensedPermission(permissionName);
      if (!licenseAllowed) {
        return sendError(res, {
          statusCode: HTTP_STATUS_FORBIDDEN,
          message: `License does not authorize: ${permissionName}`
        });
      }
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


