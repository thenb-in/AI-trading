/**
 * Shared utility functions for model operations in services
 */

/**
 * Find a model by primary key or throw error
 * @param {Model} Model - Sequelize model class
 * @param {string|number} id - Primary key value
 * @param {object} options - Sequelize find options
 * @param {string} entityName - Name of entity for error message (e.g., 'User', 'Company')
 * @returns {Promise<Model>} Found model instance
 * @throws {Error} If model not found
 */
const findModelByIdOrThrow = async (Model, id, options = {}, entityName = null) => {
  const model = await Model.findByPk(id, options);
  if (!model) {
    const name = entityName || Model.name;
    throw new Error(`${name} not found ${id}.`);
  }
  return model;
};

/**
 * Find a model by primary key without throwing (returns null if not found)
 * @param {Model} Model - Sequelize model class
 * @param {string|number} id - Primary key value
 * @param {object} options - Sequelize find options
 * @returns {Promise<Model|null>} Found model instance or null
 */
const findModelById = async (Model, id, options = {}) => {
  return await Model.findByPk(id, options);
};

/**
 * Validate name field (trim, length, characters)
 * @param {string} name - Name to validate
 * @param {object} options - Validation options
 * @param {number} options.minLength - Minimum length (default: 2)
 * @param {number} options.maxLength - Maximum length (default: 50)
 * @param {string} options.fieldName - Field name for error messages (default: 'Name')
 * @returns {string} Trimmed name
 * @throws {Error} If validation fails
 */
const validateName = (name, options = {}) => {
  const { minLength = 2, maxLength = 50, fieldName = 'Name' } = options;

  if (!name || typeof name !== 'string') {
    throw new Error(`${fieldName} is required and must be a string ${name}.`);
  }

  const trimmedName = name.trim();

  if (trimmedName.length === 0) {
    throw new Error(`${fieldName} cannot be empty ${trimmedName}.`);
  }

  if (trimmedName.length < minLength) {
    throw new Error(`${fieldName} must be at least ${minLength} characters long ${trimmedName}.`);
  }

  if (trimmedName.length > maxLength) {
    throw new Error(`${fieldName} cannot exceed ${maxLength} characters ${trimmedName.length}.`);
  }

  // Character validation - only allow letters, numbers, spaces, hyphens, and underscores
  const nameRegex = /^[a-zA-Z0-9\s\-_]+$/;
  if (!nameRegex.test(trimmedName)) {
    throw new Error(`${fieldName} can only contain letters, numbers, spaces, hyphens, and underscores ${trimmedName}.`);
  }

  return trimmedName;
};

/**
 * Validate description field (optional, trim, length)
 * @param {string|null|undefined} description - Description to validate
 * @param {object} options - Validation options
 * @param {number} options.maxLength - Maximum length (default: 500)
 * @param {string} options.fieldName - Field name for error messages (default: 'Description')
 * @returns {string|null} Trimmed description or null
 * @throws {Error} If validation fails
 */
const validateDescription = (description, options = {}) => {
  const { maxLength = 500, fieldName = 'Description' } = options;

  if (!description) {
    return null;
  }

  if (typeof description !== 'string') {
    throw new Error(`${fieldName} must be a string ${description}.`);
  }

  const trimmedDescription = description.trim();

  if (trimmedDescription.length > maxLength) {
    throw new Error(`${fieldName} cannot exceed ${maxLength} characters ${trimmedDescription}.`);
  }

  return trimmedDescription;
};

/**
 * Get reusable include configuration for User with Role and Permissions
 * @returns {array} Sequelize include configuration
 */
const getUserWithRoleInclude = () => [
  {
    model: require('../../models').Role,
    as: 'role',
    include: [{
      model: require('../../models').Permission,
      as: 'permissions',
      through: { attributes: [] },
      attributes: ['id', 'name', 'description', 'type']
    }]
  }
];

module.exports = {
  findModelByIdOrThrow,
  findModelById,
  validateName,
  validateDescription,
  getUserWithRoleInclude
};

