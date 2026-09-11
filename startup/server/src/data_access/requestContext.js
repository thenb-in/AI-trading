const { AsyncLocalStorage } = require('node:async_hooks');

const storage = new AsyncLocalStorage();

const runInRequestContext = (context, next) => storage.run({ ...context }, next);

const getRequestContext = () => storage.getStore() || {};

module.exports = {
  runInRequestContext,
  getRequestContext
};
