/** @typedef {(config: object, context: { filters: object, debugMode: boolean }) => object} FilterOptionResolver */

/** @type {FilterOptionResolver[]} */
const resolvers = [];

/**
 * Register an app-specific filter option resolver (e.g. hide a class of rows the
 * app knows should not be picked).
 * Startup filter UI runs these after built-in transforms (is_active).
 */
const registerFilterOptionResolver = (resolver) => {
  if (typeof resolver === 'function' && !resolvers.includes(resolver)) {
    resolvers.push(resolver);
  }
};

const getFilterOptionResolvers = () => resolvers;

export { registerFilterOptionResolver, getFilterOptionResolvers };
