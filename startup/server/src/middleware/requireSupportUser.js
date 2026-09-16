const { HTTP_STATUS_FORBIDDEN } = require('../constants/http');
const userService = require('../services/userService');
const { sendError } = require('../utils/response');

/**
 * Only NBnext's own support staff may pass. For the cross-company surfaces —
 * assigning support users to companies, listing them — which belong to whoever
 * runs the installation rather than to any one company's admin.
 */
async function requireSupportUser(req, res, next) {
  if (!await userService.isSupportUser(req.user.id)) {
    return sendError(res, {
      statusCode: HTTP_STATUS_FORBIDDEN,
      message: `You are not authorized: ${req.method} ${req.originalUrl} is for support users only`
    });
  }
  return next();
}

module.exports = requireSupportUser;
