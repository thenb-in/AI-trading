const logger = require('../../logger');
const { runInRequestContext } = require('./requestContext');
const { resolveDataScope } = require('./index');

/**
 * Works out what this login may see, then runs the rest of the request inside
 * a context every query underneath can read.
 */
const attachDataScope = async (req, res, next) => {
  try {
    const dataScope = await resolveDataScope(req.user);
    req.dataScope = dataScope;
    return runInRequestContext({ dataScope, user: req.user }, next);
  } catch (error) {
    logger.error(`Could not work out the data access of user ${req.user?.id} in company ${req.user?.company_id}. ${error.message}`, error);
    return next(error);
  }
};

module.exports = { attachDataScope };
