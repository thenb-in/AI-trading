const { HTTP_STATUS_FORBIDDEN } = require('../constants/http');
const userService = require('../services/userService');
const { sendError } = require('../utils/response');

/**
 * For the routes that name a company in their path: your own company is yours
 * to read, and reading any other one takes support staff, who work across every
 * company on the installation.
 */
async function requireOwnCompanyOrSupport(req, res, next) {
  const { companyId } = req.params;
  if (companyId === req.user.company_id || await userService.isSupportUser(req.user.id)) {
    return next();
  }
  return sendError(res, {
    statusCode: HTTP_STATUS_FORBIDDEN,
    message: `You are not authorized: company ${companyId} is not yours`
  });
}

module.exports = requireOwnCompanyOrSupport;
