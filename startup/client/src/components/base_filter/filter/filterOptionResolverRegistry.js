/** @typedef {(config: object, context: { filters: object, debugMode: boolean }) => object} FilterOptionResolver */

/** @type {FilterOptionResolver[]} */
const resolvers = [];

/**
 * Register an app-specific filter option resolver (e.g. hide weekly employees).
 * Startup filter UI runs these after built-in transforms (is_active).
 */
const registerFilterOptionResolver = (resolver) => {
  if (typeof resolver === 'function' && !resolvers.includes(resolver)) {
    resolvers.push(resolver);
  }
};

const getFilterOptionResolvers = () => resolvers;

export { registerFilterOptionResolver, getFilterOptionResolvers };
