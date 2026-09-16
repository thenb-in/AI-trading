// Roles, and which permissions each one carries. Users, companies and the
// Permission table itself are other services' business — this one only joins
// roles to permissions.
const { Op } = require('sequelize');
const logger = require('../../logger');
// Role is the primary model for this service
// Permission is needed for includes in getRolesAndPermissions
const { Role, Permission } = require('../models');
const { findModelByIdOrThrow, validateName, validateDescription } = require('../utils/modelHelpers');
const permissionService = require('./permissionService');
const { formatPermissions } = require('../data_formatters/permission_formatter');
const userService = require('./userService');
const { sequelizeErrors } = require('../constants/errors');


/**
 * Checks if a role with the given name already exists for the specified company (or globally).
 * @param {string} name - Role name to check (trimmed)
 * @param {string|null} companyId - Company scope (null for global roles)
 * @returns {Promise<Object|null>} Existing role instance or null
 */
const checkRoleExists = async (name, companyId = null) => {
  const whereClause = { name: name.trim() };
  if (companyId) {
    whereClause.companyId = companyId;
  } else {
    whereClause.companyId = null;
  }
  const existingRole = await Role.findOne({ where: whereClause });
  return existingRole;
};

/**
 * Creates a new role, validating name uniqueness within the company scope.
 * @param {string} name - Role name (2-50 chars, alphanumeric + spaces/hyphens/underscores)
 * @param {string|null} description - Optional role description (max 500 chars)
 * @param {string|null} companyId - Company scope (null for global role)
 * @returns {Promise<Object>} Created Role model instance
 * @throws {Error} If a role with the same name already exists in the same scope
 */
const createRole = async (name, description, companyId = null) => {
  const trimmedName = validateName(name, { fieldName: 'Role name' });
  const trimmedDescription = validateDescription(description);

  // Check for duplicate
  const existingRole = await checkRoleExists(trimmedName, companyId);
  if (existingRole) {
    const roleType = companyId ? 'company-specific' : 'global';
    throw new Error(`Role with name "${trimmedName}" already exists as a ${roleType} role`);
  }

  // Create the role
  const newRole = await Role.create({
    name: trimmedName,
    description: trimmedDescription,
    companyId: companyId
  });

  logger.info(`Created role "${trimmedName}" with companyId: ${companyId || 'null (global)'}`);
  return newRole;
};

const getRolesAndPermissions = async (companyId) => {
  // Everyone sees the global (default) roles plus their own company's.
  const roles = await Role.findAll({
    where: { [Op.or]: [{ companyId: null }, { companyId }] },
    include: {
      model: Permission,
      as: 'permissions',
      through: { attributes: [] },
      attributes: ['id', 'name', 'display_name', 'description', 'type']
    },
    order: [['name', 'ASC']]
  });

  return roles.map((role) => ({
    ...role.toJSON(),
    isGlobal: role.companyId === null,
    permissions: formatPermissions(role.permissions)
  }));
};

/**
 * Removes a permission from a role. Only super admins can modify global/default roles.
 * @param {number} roleId - Role ID
 * @param {number} permissionId - Permission ID to remove
 * @param {string|number} userId - ID of the user performing the action (for support-user check)
 * @returns {Promise<{ message: string }>} Success message
 * @throws {{ status: number, message: string }} If role/permission not found or unauthorized
 */
const removePermissionFromRole = async (roleId, permissionId, userId) => {
  try {
    const role = await findModelByIdOrThrow(Role, roleId, {}, 'Role');

    // Check if role is a default/global role (companyId is null)
    if (role.companyId === null) {
      // Only superadmins can modify default roles - use userService
      const user = await userService.getUserById(userId);
      if (!user.isSupportUser) {
        throw { status: 403, message: 'Only superadmins can modify default system roles' };
      }
    }

    // Use permissionService for Permission operations
    const permission = await permissionService.getPermissionById(permissionId);
    await role.removePermission(permission);
    return { message: 'Permission removed from role successfully' };
  } catch (error) {
    throw { status: error.status || 500, message: error.message };
  }
};

/**
 * Adds one or more permissions to a role. Only super admins can modify global/default roles.
 * @param {number} roleId - Role ID
 * @param {number|Array<number>} permissionIds - Permission ID(s) to add
 * @param {string|number} userId - ID of the user performing the action (for support-user check)
 * @returns {Promise<{ message: string }>} Success message with count
 * @throws {{ status: number, message: string }} If role/permissions not found, unauthorized, or duplicate
 */
const addPermissionToRole = async (roleId, permissionIds, userId) => {
  try {
    // Ensure permissionIds is an array
    const permissionIdArray = Array.isArray(permissionIds) ? permissionIds : [permissionIds];

    const role = await findModelByIdOrThrow(Role, roleId, {}, 'Role');

    // Check if role is a default/global role (companyId is null)
    if (role.companyId === null) {
      // Only superadmins can modify default roles - use userService
      const user = await userService.getUserById(userId);
      if (!user.isSupportUser) {
        throw { status: 403, message: 'Only superadmins can modify default system roles' };
      }
    }

    // Use permissionService for Permission operations
    const permissions = await permissionService.getPermissionsByIds(permissionIdArray);

    // Check if all permissions were found
    if (permissions.length !== permissionIdArray.length) {
      const foundIds = permissions.map(p => p.id);
      const missingIds = permissionIdArray.filter(id => !foundIds.includes(id));
      throw { status: 404, message: `Permissions with ids ${missingIds.join(', ')} not found` };
    }

    // Add all permissions at once
    await role.addPermissions(permissions);

    return {
      message: `Successfully added ${permissions.length} permission(s) to role`
    };
  } catch (error) {
    if (error.name === sequelizeErrors.SEQUELIZE_UNIQUE_CONSTRAINT_ERROR) {
      throw { status: 409, message: `One or more permissions are already assigned to role with id ${roleId}` };
    }
    throw {
      status: error.status || 500,
      message: error.message || `Error adding permissions to role with id ${roleId}`
    };
  }
};

module.exports = {
  createRole,
  getRolesAndPermissions,
  removePermissionFromRole,
  addPermissionToRole
};
