// Registry for app-supplied model column extensions.

const registry = {}; // modelName -> Array<(DataTypes) => Object>

/**
 * Register a factory that returns extra Sequelize column definitions for a model.
 */
function registerModelFields(modelName, fieldFactory) {
  if (typeof fieldFactory !== 'function') {
    throw new Error(`registerModelFields(${modelName}): fieldFactory must be a function`);
  }
  if (!registry[modelName]) {
    registry[modelName] = [];
  }
  registry[modelName].push(fieldFactory);
}

/**
 * Resolve all registered extra columns for a model. Returns {} when nothing is
 * registered (e.g. a standalone framework process that never loaded the app).
 */
function getModelFields(modelName, DataTypes) {
  return (registry[modelName] || []).reduce(
    (acc, factory) => Object.assign(acc, factory(DataTypes)),
    {}
  );
}

module.exports = { registerModelFields, getModelFields };
