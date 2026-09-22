const logger = require('../../logger');

// Login and /me send the client a `company` holding the framework's own fields.
// An app adds its company-level settings to it through this hook, because
// startup must not import @appServer.
//
// Deliberately not applied inside authService.getCurrentUser: allowedPermissions
// calls that on every permission check, which must not pay for the extra reads.
let extendCompany = null;

const registerCompanyPayloadExtender = (extender) => {
  if (typeof extender !== 'function') {
    throw new Error(`registerCompanyPayloadExtender needs a function, received: ${typeof extender}`);
  }
  extendCompany = extender;
};

/**
 * `user` with the app's fields added to `user.company`. The framework's own
 * fields win on a clash. Unchanged when nothing is registered or the user has
 * no company; a failing extender is logged rather than failing the login.
 */
const withExtendedCompany = async (user) => {
  if (!extendCompany || !user?.company?.id) {
    return user;
  }
  try {
    const extra = await extendCompany(user.company.id);
    return extra ? { ...user, company: { ...extra, ...user.company } } : user;
  } catch (error) {
    logger.error(`Company payload extender failed for company ${user.company.id}; sending the base company`, error);
    return user;
  }
};

module.exports = {
  registerCompanyPayloadExtender,
  withExtendedCompany
};
