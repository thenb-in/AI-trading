const { getRequestContext, runInRequestContext } = require('./requestContext');
const { UNRESTRICTED } = require('./constants');

let resolveForUser = null;


const registerDataScopeResolver = (resolver) => {
  if (typeof resolver !== 'function') {
    throw new Error(`registerDataScopeResolver needs a function, received: ${typeof resolver}`);
  }
  resolveForUser = resolver;
};

const resolveDataScope = async (user) => {
  if (!resolveForUser || !user?.id || !user?.company_id) {
    return UNRESTRICTED;
  }
  return (await resolveForUser(user)) || UNRESTRICTED;
};

/** What the request in flight may see. Unrestricted when there is no request behind the call. */
const getDataScope = () => getRequestContext().dataScope || UNRESTRICTED;


const runUnscoped = (next) => runInRequestContext({ ...getRequestContext(), dataScope: UNRESTRICTED }, next);

module.exports = {
  registerDataScopeResolver,
  resolveDataScope,
  getDataScope,
  runUnscoped
};
